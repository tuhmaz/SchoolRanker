import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">جدول الطلبة و مجموع الغياب</h1>
        <p className="text-muted-foreground mt-2">إدارة وتتبع غياب الطلاب حسب الشهر والفصل الدراسي</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>اختيار الفصل الدراسي</CardTitle>
          <CardDescription>اختر الفصل الدراسي الذي تريد إدارة غياب طلابه</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">الفصل الدراسي</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSemester("1")}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    selectedSemester === "1"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  📅 الفصل الأول (5 أشهر)
                </button>
                <button
                  onClick={() => setSelectedSemester("2")}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    selectedSemester === "2"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  📅 الفصل الثاني (6 أشهر)
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>اختيار الفصل الدراسي (الشعبة)</CardTitle>
          <CardDescription>اختر الفصل لعرض وتحديث بيانات الغياب</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر فصلاً..." />
            </SelectTrigger>
            <SelectContent>
              {availableDivisions.map((div) => (
                <SelectItem key={div.id} value={div.id}>
                  {div.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!students.length && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              ⚠️ لم يتم تحميل بيانات الطلاب. يرجى الذهاب إلى <strong>التجهيزات الأساسية</strong> وتحميل ملف الطلاب أولاً.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedDivisionId && students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>بيانات الغياب</CardTitle>
                <CardDescription>عدد الطلاب: {selectedStudents.length}</CardDescription>
              </div>
              <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    تصدير إلى Excel
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="ابحث عن طالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border px-4 py-2 text-right font-semibold">الطالب</th>
                    {months.map((month) => (
                      <th key={month} className="border px-2 py-2 text-center font-semibold text-sm">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedStudents.length > 0 ? (
                    selectedStudents.map((student) => {
                      const studentAbsences = absenceData.filter((a) => a.studentId === student.id);
                      const studentName = `${student.firstName || ""} ${student.fatherName || ""} ${student.grandName || ""} ${student.familyName || ""}`.trim();
                      return (
                        <tr key={student.id} className="hover:bg-muted/50">
                          <td className="border px-4 py-2 font-medium text-right sticky left-0 bg-background">
                            {studentName}
                          </td>
                          {months.map((month) => {
                            const absence = studentAbsences.find((a) => a.month === month);
                            return (
                              <td key={`${student.id}-${month}`} className="border px-2 py-2 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  value={absence?.absenceCount ?? 0}
                                  onChange={(e) =>
                                    updateAbsence(student.id, month, parseInt(e.target.value) || 0)
                                  }
                                  className="w-12 h-8 text-center"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={months.length + 1} className="border px-4 py-8 text-center text-muted-foreground">
                        {selectedDivisionId ? "لا توجد طلاب في هذا الفصل" : "يرجى اختيار فصلاً أولاً"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
