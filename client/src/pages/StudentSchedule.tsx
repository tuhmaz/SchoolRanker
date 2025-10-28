import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CalendarDays, ClipboardList, Download, Loader2, Search, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StudentAbsence {
  studentId: string;
  studentName: string;
  month: string;
  absenceCount: number;
}

export default function StudentSchedulePage() {
  const { toast } = useToast();
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<"1" | "2">("1");
  const [absenceData, setAbsenceData] = useState<StudentAbsence[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<any[]>([]);

  const semester1Months = [
    "آب",
    "ايلول",
    "تشرين الاول",
    "تشرين الثاني",
    "كانون الاول",
  ];

  const semester2Months = [
    "كانون الثاني",
    "شباط",
    "آذار",
    "نيسان",
    "أيار",
    "حزيران",
  ];

  // Load settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('appSettings');
      console.log('[StudentSchedule] Raw settings:', raw);
      if (raw) {
        const saved = JSON.parse(raw);
        console.log('[StudentSchedule] Parsed settings:', saved);
        const studentsList = Array.isArray(saved.students) ? saved.students : [];
        console.log('[StudentSchedule] Students loaded:', studentsList.length);
        setStudents(studentsList);
      } else {
        console.log('[StudentSchedule] No settings found in localStorage');
      }
    } catch (e) {
      console.error('[StudentSchedule] Failed to load settings:', e);
    }
  }, []);

  const availableDivisions = useMemo(() => {
    if (!students.length) return [];
    const divisions = new Map<string, { id: string; name: string }>();
    students.forEach((student) => {
      const id = `${student.class}-${student.division}`;
      if (!divisions.has(id)) {
        divisions.set(id, {
          id,
          name: `${student.class} - ${student.division}`,
        });
      }
    });
    return Array.from(divisions.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [students]);

  const selectedStudents = useMemo(() => {
    if (!students.length || !selectedDivisionId) return [];
    return students
      .filter((student) => `${student.class}-${student.division}` === selectedDivisionId)
      .sort((a, b) => {
        const nameA = `${a.firstName || ""} ${a.fatherName || ""} ${a.grandName || ""} ${a.familyName || ""}`.trim();
        const nameB = `${b.firstName || ""} ${b.fatherName || ""} ${b.grandName || ""} ${b.familyName || ""}`.trim();
        return nameA.localeCompare(nameB, "ar");
      });
  }, [students, selectedDivisionId]);

  const filteredAbsences = useMemo(() => {
    if (!searchTerm) return absenceData;
    return absenceData.filter((item) =>
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.studentName.includes(searchTerm)
    );
  }, [absenceData, searchTerm]);

  const months = selectedSemester === "1" ? semester1Months : semester2Months;

  const visibleStudents = useMemo(() => {
    if (!searchTerm) return selectedStudents;
    return selectedStudents.filter((student) => {
      const fullName = `${student.firstName || ""} ${student.fatherName || ""} ${student.grandName || ""} ${student.familyName || ""}`.trim();
      return fullName.includes(searchTerm) || fullName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [selectedStudents, searchTerm]);

  const totalAbsenceEntries = absenceData.length;
  const totalMarkedAbsences = useMemo(
    () => absenceData.reduce((sum, item) => sum + (Number.isFinite(item.absenceCount) ? item.absenceCount : 0), 0),
    [absenceData],
  );

  const totalStudentsTracked = selectedStudents.length;
  const hasData = selectedDivisionId && selectedStudents.length > 0;

  useEffect(() => {
    if (selectedDivisionId && selectedStudents.length > 0) {
      const data: StudentAbsence[] = [];
      selectedStudents.forEach((student) => {
        months.forEach((month) => {
          data.push({
            studentId: student.id,
            studentName: `${student.firstName || ""} ${student.fatherName || ""} ${student.grandName || ""} ${student.familyName || ""}`.trim(),
            month,
            absenceCount: 0,
          });
        });
      });
      setAbsenceData(data);
    }
  }, [selectedDivisionId, selectedStudents]);

  const updateAbsence = (studentId: string, month: string, count: number) => {
    setAbsenceData((prev) =>
      prev.map((item) =>
        item.studentId === studentId && item.month === month
          ? { ...item, absenceCount: Math.max(0, count) }
          : item
      )
    );
  };

  const handleExport = async () => {
    if (!selectedDivisionId) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار فصل أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/export/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: selectedStudents.map((s) => ({
            id: s.id,
            firstName: s.firstName,
            fatherName: s.fatherName,
            grandName: s.grandName,
            familyName: s.familyName,
            classId: s.class,
          })),
          absences: absenceData,
        }),
      });

      if (!response.ok) throw new Error("فشل التصدير");

      const result = await response.json();
      toast({
        title: "نجح",
        description: "تم تصدير الملف بنجاح",
      });
      const downloadUrl = `/api/export/schedule/${result.id}`;
      window.location.href = downloadUrl;
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التصدير",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-12 sm:px-6 lg:px-8" dir="rtl">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-b from-primary/10 via-muted/40 to-background px-6 py-7 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ClipboardList className="h-4 w-4" /> لوحة الجداول والغياب
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">جدول الطلبة ومجموع الغياب</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              تتبع غياب الطلبة لكل شهر في الفصل الدراسي، عدّل البيانات بسرعة ثم صدّر جدولًا منسقًا للاستخدام المدرسي.
            </p>
          </div>
          <div className="grid w-full gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm sm:grid-cols-2 lg:max-w-lg">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">تحكم بالفصل الدراسي</p>
                <p className="text-xs text-muted-foreground">غيّر الفصل وستتم إعادة ترتيب الأشهر تلقائيًا للتحديث السريع.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">تصدير جاهز للطباعة</p>
                <p className="text-xs text-muted-foreground">أنشئ ملف Excel موحد يضم أسماء الطلبة مع إجمالي الغياب.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 bg-primary/10">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-primary">عدد الطلاب المتاحين</span>
            <span className="text-2xl font-bold text-foreground">{students.length}</span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/30">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-muted-foreground">طلاب الفصل الحالي</span>
            <span className="text-2xl font-bold text-foreground">{totalStudentsTracked}</span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-emerald-500/10">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">عدد الخانات المغطاة</span>
            <span className="text-2xl font-bold text-foreground">{totalAbsenceEntries}</span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-destructive/10">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-destructive">مجموع الغياب المسجّل</span>
            <span className="text-2xl font-bold text-foreground">{totalMarkedAbsences}</span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarDays className="h-5 w-5 text-primary" /> اختيار الفصل الدراسي
            </CardTitle>
            <CardDescription>حدد الفصل الدراسي لتحديث الأشهر المعروضة تلقائيًا.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {[{
                id: "1",
                label: "الفصل الأول",
                detail: "5 أشهر"
              }, {
                id: "2",
                label: "الفصل الثاني",
                detail: "6 أشهر"
              }].map((option) => {
                const isActive = selectedSemester === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedSemester(option.id as "1" | "2")}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors",
                      isActive
                        ? "border-primary/60 bg-primary/10 text-primary-foreground/80"
                        : "border-border/60 bg-muted/20 hover:bg-muted/40",
                    )}
                  >
                    <div className="text-right">
                      <p className="text-base font-semibold text-foreground">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.detail}</p>
                    </div>
                    <CalendarDays className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  </button>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <Users className="ml-2 inline-block h-4 w-4 text-primary" /> يتم تجهيز جدول الغياب لكل طالب في الفصل المختار تلقائيًا.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" /> اختيار الصف والشعبة
            </CardTitle>
            <CardDescription>اختر الفصل لعرض وتحديث سجلات الغياب الخاصة به.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
              <SelectTrigger className="h-12 justify-between text-right">
                <SelectValue placeholder="اختر صفًا وشعبة..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 text-right">
                {availableDivisions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">لم يتم العثور على شعب.</div>
                ) : (
                  availableDivisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!students.length && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <p>
                  لم يتم تحميل بيانات الطلاب بعد. توجه إلى <strong>التجهيزات الأساسية</strong> وقم برفع ملف الطلبة من منصة أجيال.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {hasData ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">سجل الغياب التفصيلي</CardTitle>
                <CardDescription>
                  يتم عرض {visibleStudents.length} طالب/ة من أصل {totalStudentsTracked} في الفصل الحالي.
                </CardDescription>
              </div>
              <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    تصدير إلى Excel
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن طالب بالاسم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3"
                />
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                يتم حفظ التعديلات فورًا، وتعتبر الخانة فارغة إذا القيمة 0.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-fixed border-collapse text-sm sm:min-w-[720px]">
                <thead>
                  <tr className="bg-muted/40 text-xs font-semibold sm:text-sm">
                    <th className="sticky right-0 border border-border/60 bg-background px-3 py-2 text-right">الطالب</th>
                    {months.map((month) => (
                      <th key={month} className="border border-border/60 px-2 py-2 text-center">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.length > 0 ? (
                    visibleStudents.map((student) => {
                      const studentAbsences = absenceData.filter((a) => a.studentId === student.id);
                      const studentName = `${student.firstName || ""} ${student.fatherName || ""} ${student.grandName || ""} ${student.familyName || ""}`.trim();
                      return (
                        <tr key={student.id} className="even:bg-muted/30">
                          <td className="sticky right-0 border border-border/60 bg-background/90 px-3 py-2 text-right font-medium">
                            {studentName}
                          </td>
                          {months.map((month) => {
                            const absence = studentAbsences.find((a) => a.month === month);
                            return (
                              <td key={`${student.id}-${month}`} className="border border-border/60 px-2 py-2 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  value={absence?.absenceCount ?? 0}
                                  onChange={(e) => updateAbsence(student.id, month, parseInt(e.target.value) || 0)}
                                  className="h-9 w-14 text-center"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={months.length + 1}
                        className="border border-border/60 px-4 py-10 text-center text-muted-foreground"
                      >
                        {searchTerm ? "لا توجد نتائج مطابقة لعملية البحث الحالية." : "لا يوجد طلبة مرتبطون بهذه الشعبة."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 bg-muted/20 py-6 text-center text-sm text-muted-foreground">
          <CardContent>
            اختر فصلًا وشعبة لبدء تسجيل الغياب. تأكد من تحميل بيانات الطلبة من صفحة التجهيزات أولًا.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
