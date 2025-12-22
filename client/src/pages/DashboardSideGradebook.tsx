import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, BadgeCheck, Clock, Download, FileSpreadsheet, Loader2, Printer, Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type Student = { id: string; name: string; class: string; division: string };
type ClassGroup = { className: string; divisions: Array<{ id: string; division: string; subjects?: Array<{ id: string; name: string }> }> };

type RecordsData = {
  teacherName?: string;
  directorate?: string;
  school?: string;
  town?: string;
  program?: string;
  year?: string;
  isHomeroom?: boolean;
  homeroomClass?: string;
  schoolInfo?: { directorate: string; school: string; program: string };
  students: Student[];
  classes: ClassGroup[];
};

type RecordsResponse = {
  ok: true;
  record: { data: RecordsData; updatedAt: string } | null;
};

type StudentGrades = {
  t1Eval1?: number | null;
  t1Eval2?: number | null;
  t1Eval3?: number | null;
  t1Final?: number | null;
  t2Eval1?: number | null;
  t2Eval2?: number | null;
  t2Eval3?: number | null;
  t2Final?: number | null;
  note?: string | null;
  eval1?: number | null;
  eval2?: number | null;
  eval3?: number | null;
  final?: number | null;
};

type SideGradebookState = {
  byGroup?: Record<string, { className?: string; division?: string; gradesByStudentId?: Record<string, StudentGrades> }>;
};

type SideGradebookResponse = {
  ok: true;
  sideGradebook: SideGradebookState | null;
  updatedAt: string | null;
};

const normalizeText = (value: unknown) => {
  const text = value != null ? String(value).trim() : "";
  return text;
};

const buildGroupKey = (className: string, division: string) => `${normalizeText(className) || "غير محدد"}|||${normalizeText(division) || "بدون شعبة"}`;

const normalizeGradeValue = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const normalizeNoteValue = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const gradesEqual = (a: StudentGrades | undefined, b: StudentGrades | undefined) => {
  const aT1Eval1 = normalizeGradeValue(a?.t1Eval1);
  const aT1Eval2 = normalizeGradeValue(a?.t1Eval2);
  const aT1Eval3 = normalizeGradeValue(a?.t1Eval3);
  const aT1Final = normalizeGradeValue(a?.t1Final);
  const aT2Eval1 = normalizeGradeValue(a?.t2Eval1);
  const aT2Eval2 = normalizeGradeValue(a?.t2Eval2);
  const aT2Eval3 = normalizeGradeValue(a?.t2Eval3);
  const aT2Final = normalizeGradeValue(a?.t2Final);
  const aNote = normalizeNoteValue(a?.note);
  const a1 = normalizeGradeValue(a?.eval1);
  const a2 = normalizeGradeValue(a?.eval2);
  const a3 = normalizeGradeValue(a?.eval3);
  const a4 = normalizeGradeValue(a?.final);
  const bT1Eval1 = normalizeGradeValue(b?.t1Eval1);
  const bT1Eval2 = normalizeGradeValue(b?.t1Eval2);
  const bT1Eval3 = normalizeGradeValue(b?.t1Eval3);
  const bT1Final = normalizeGradeValue(b?.t1Final);
  const bT2Eval1 = normalizeGradeValue(b?.t2Eval1);
  const bT2Eval2 = normalizeGradeValue(b?.t2Eval2);
  const bT2Eval3 = normalizeGradeValue(b?.t2Eval3);
  const bT2Final = normalizeGradeValue(b?.t2Final);
  const bNote = normalizeNoteValue(b?.note);
  const b1 = normalizeGradeValue(b?.eval1);
  const b2 = normalizeGradeValue(b?.eval2);
  const b3 = normalizeGradeValue(b?.eval3);
  const b4 = normalizeGradeValue(b?.final);
  return (
    aT1Eval1 === bT1Eval1 &&
    aT1Eval2 === bT1Eval2 &&
    aT1Eval3 === bT1Eval3 &&
    aT1Final === bT1Final &&
    aT2Eval1 === bT2Eval1 &&
    aT2Eval2 === bT2Eval2 &&
    aT2Eval3 === bT2Eval3 &&
    aT2Final === bT2Final &&
    aNote === bNote &&
    a1 === b1 &&
    a2 === b2 &&
    a3 === b3 &&
    a4 === b4
  );
};

const computeGroupDirtyCount = (
  studentIds: string[],
  draft: Record<string, StudentGrades> | undefined,
  saved: Record<string, StudentGrades> | undefined,
) => {
  let count = 0;
  for (const id of studentIds) {
    const a = draft?.[id];
    const b = saved?.[id];
    if (!gradesEqual(a, b)) count += 1;
  }
  return count;
};

export default function DashboardSideGradebook() {
  const { toast } = useToast();

  const {
    data: recordsRes,
    isLoading: isRecordsLoading,
    isError: isRecordsError,
    error: recordsError,
  } = useQuery<RecordsResponse>({
    queryKey: ["/api/dashboard/records"],
    queryFn: getQueryFn<RecordsResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const {
    data: sideRes,
    isLoading: isSideLoading,
    isError: isSideError,
    error: sideError,
  } = useQuery<SideGradebookResponse>({
    queryKey: ["/api/dashboard/side-gradebook"],
    queryFn: getQueryFn<SideGradebookResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const settings = recordsRes?.record?.data ?? null;
  const classes = settings?.classes ?? [];
  const students = settings?.students ?? [];

  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [draftByGroup, setDraftByGroup] = useState<Record<string, Record<string, StudentGrades>>>({});
  const [savedByGroup, setSavedByGroup] = useState<Record<string, Record<string, StudentGrades>>>({});
  const [dirtyCountByGroup, setDirtyCountByGroup] = useState<Record<string, number>>({});

  const [isExporting, setIsExporting] = useState(false);
  const [showExportOverlay, setShowExportOverlay] = useState(false);
  const [lastExportId, setLastExportId] = useState<string | null>(null);

  const lastUpdatedLabel = useMemo(() => {
    if (!sideRes?.updatedAt) return null;
    const date = new Date(sideRes.updatedAt);
    if (Number.isNaN(date.getTime())) return sideRes.updatedAt;
    return date.toLocaleString("ar", { hour12: true });
  }, [sideRes?.updatedAt]);

  const savedGroupsCount = useMemo(() => Object.keys(savedByGroup).length, [savedByGroup]);

  const classOptions = useMemo(() => {
    const order: string[] = [];
    classes.forEach((c) => {
      const name = normalizeText(c.className);
      if (name && !order.includes(name)) order.push(name);
    });
    students.forEach((s) => {
      const name = normalizeText(s.class) || "غير محدد";
      if (!order.includes(name)) order.push(name);
    });
    return order;
  }, [classes, students]);

  const divisionOptions = useMemo(() => {
    const selected = normalizeText(selectedClassName) || "غير محدد";

    const fromStudents = students
      .filter((s) => (normalizeText(s.class) || "غير محدد") === selected)
      .map((s) => normalizeText(s.division) || "بدون شعبة");

    const fromClasses = classes
      .filter((c) => (normalizeText(c.className) || "غير محدد") === selected)
      .flatMap((c) =>
        Array.isArray(c.divisions)
          ? c.divisions.map((d) => normalizeText((d as any)?.division) || "بدون شعبة")
          : [],
      );

    return Array.from(new Set([...fromStudents, ...fromClasses]));
  }, [classes, selectedClassName, students]);

  useEffect(() => {
    if (hasHydrated) return;
    if (!sideRes) return;

    const byGroup = sideRes.sideGradebook?.byGroup;
    const next: Record<string, Record<string, StudentGrades>> = {};

    if (byGroup && typeof byGroup === "object") {
      Object.entries(byGroup).forEach(([key, group]) => {
        const grades = group?.gradesByStudentId;
        if (grades && typeof grades === "object") next[key] = grades;
      });
    }

    setDraftByGroup(next);
    setSavedByGroup(next);
    setDirtyCountByGroup(Object.fromEntries(Object.keys(next).map((key) => [key, 0])));
    setHasHydrated(true);
  }, [hasHydrated, sideRes]);

  useEffect(() => {
    if (!selectedClassName && classOptions.length > 0) {
      setSelectedClassName(classOptions[0]!);
      return;
    }
    if (selectedClassName && classOptions.length > 0 && !classOptions.includes(selectedClassName)) {
      setSelectedClassName(classOptions[0]!);
    }
  }, [classOptions, selectedClassName]);

  useEffect(() => {
    if (!selectedDivision && divisionOptions.length > 0) {
      setSelectedDivision(divisionOptions[0]!);
      return;
    }
    if (selectedDivision && divisionOptions.length > 0 && !divisionOptions.includes(selectedDivision)) {
      setSelectedDivision(divisionOptions[0]!);
    }
  }, [divisionOptions, selectedDivision]);

  const activeGroupKey = useMemo(() => buildGroupKey(selectedClassName, selectedDivision), [selectedClassName, selectedDivision]);

  const activeStudents = useMemo(() => {
    const cls = normalizeText(selectedClassName) || "غير محدد";
    const div = normalizeText(selectedDivision) || "بدون شعبة";
    return students
      .filter((s) => (normalizeText(s.class) || "غير محدد") === cls && (normalizeText(s.division) || "بدون شعبة") === div)
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }));
  }, [selectedClassName, selectedDivision, students]);

  const activeStudentIds = useMemo(() => activeStudents.map((s) => s.id), [activeStudents]);

  const activeGrades = draftByGroup[activeGroupKey] ?? {};
  const savedActiveGrades = savedByGroup[activeGroupKey] ?? {};

  const isDirty = (dirtyCountByGroup[activeGroupKey] ?? computeGroupDirtyCount(activeStudentIds, activeGrades, savedActiveGrades)) > 0;

  useEffect(() => {
    setDirtyCountByGroup((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, activeGroupKey)) return prev;
      const count = computeGroupDirtyCount(activeStudentIds, activeGrades, savedActiveGrades);
      return { ...prev, [activeGroupKey]: count };
    });
  }, [activeGroupKey]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const updateGrade = (studentId: string, patch: Partial<StudentGrades>) => {
    const groupKey = activeGroupKey;
    setDraftByGroup((prev) => {
      const currentGroup = prev[groupKey] ?? {};
      const currentStudent = currentGroup[studentId] ?? {};
      const nextStudent = { ...currentStudent, ...patch };

      const savedStudent = (savedByGroup[groupKey] ?? {})[studentId];
      const wasDirty = !gradesEqual(currentStudent, savedStudent);
      const isNowDirty = !gradesEqual(nextStudent, savedStudent);

      if (wasDirty !== isNowDirty) {
        setDirtyCountByGroup((prevCounts) => {
          const base = prevCounts[groupKey] ?? 0;
          const next = Math.max(0, base + (isNowDirty ? 1 : -1));
          if (next === base) return prevCounts;
          return { ...prevCounts, [groupKey]: next };
        });
      }

      return {
        ...prev,
        [groupKey]: {
          ...currentGroup,
          [studentId]: nextStudent,
        },
      };
    });
  };

  const parseMark = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
  };

  const parseNote = (raw: string) => {
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  };

  const buildExportRequestBody = () => {
    return JSON.stringify({
      classes,
      students,
      teacherName: settings?.teacherName ?? "",
      school: settings?.school ?? "",
      directorate: settings?.directorate ?? "",
      town: settings?.town ?? "",
      program: settings?.program ?? settings?.schoolInfo?.program ?? "",
      year: settings?.year ?? "",
      isHomeroom: Boolean(settings?.isHomeroom),
      homeroomClass: settings?.homeroomClass ?? "",
      gradebook: {
        byGroup: Object.fromEntries(
          Object.entries(draftByGroup).map(([key, gradesByStudentId]) => [
            key,
            {
              gradesByStudentId,
            },
          ]),
        ),
      },
    });
  };

  const handleSaveGrades = async () => {
    if (isSavingGrades) return;
    if (!settings) return;
    if (!selectedClassName || !selectedDivision) return;
    if (activeStudents.length === 0) {
      toast({ title: "لا يوجد طلبة", description: "لا توجد أسماء طلبة ضمن المجموعة المحددة.", variant: "destructive" });
      return;
    }

    setIsSavingGrades(true);
    try {
      const payloadGrades: Record<string, StudentGrades> = {};
      activeStudents.forEach((s) => {
        payloadGrades[s.id] = activeGrades[s.id] ?? {};
      });

      await apiRequest("PUT", "/api/dashboard/side-gradebook", {
        className: normalizeText(selectedClassName) || "غير محدد",
        division: normalizeText(selectedDivision) || "بدون شعبة",
        gradesByStudentId: payloadGrades,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/side-gradebook"] });
      setDraftByGroup((prev) => ({ ...prev, [activeGroupKey]: payloadGrades }));
      setSavedByGroup((prev) => ({ ...prev, [activeGroupKey]: payloadGrades }));
      setDirtyCountByGroup((prev) => ({ ...prev, [activeGroupKey]: 0 }));
      toast({ title: "تم الحفظ", description: "تم حفظ التقويمات داخل حسابك.", variant: "success" });
    } catch (e: any) {
      toast({ title: "تعذر الحفظ", description: String(e?.message ?? "حدث خطأ غير متوقع"), variant: "destructive" });
    } finally {
      setIsSavingGrades(false);
    }
  };

  const requestExport = async () => {
    const res = await fetch("/api/export/side-gradebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildExportRequestBody(),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || "تعذر إنشاء ملف التصدير");
    }
    return res.json();
  };

  const handleGenerate = async () => {
    if (isExporting) return;
    if (!settings || classes.length === 0 || students.length === 0) {
      toast({ title: "لا توجد بيانات", description: "أضف بيانات السجلات أولاً من لوحة التحكم.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setShowExportOverlay(true);
    try {
      const data = await requestExport();
      const id = String(data.id || "");
      setLastExportId(id || null);
      toast({ title: "تم إنشاء السجل", description: `تم تجهيز الملف: ${data.filename ?? ""}`.trim() });
    } catch (e: any) {
      toast({ title: "فشل إنشاء الملف", description: String(e?.message ?? "تعذر إنشاء ملف التصدير"), variant: "destructive" });
    } finally {
      setShowExportOverlay(false);
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (isExporting) return;
    if (!settings || classes.length === 0 || students.length === 0) {
      toast({ title: "لا توجد بيانات", description: "أضف بيانات السجلات أولاً من لوحة التحكم.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setShowExportOverlay(true);
    try {
      const data = await requestExport();
      const id = String(data.id || "");
      setLastExportId(id || null);
      if (id) {
        window.open(`/api/export/side-gradebook?id=${encodeURIComponent(id)}`, "_blank");
      }
    } catch (e: any) {
      toast({ title: "تعذر التنزيل", description: String(e?.message ?? "حدث خطأ غير متوقع"), variant: "destructive" });
    } finally {
      setShowExportOverlay(false);
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6" dir="rtl">
      {showExportOverlay && <LoadingOverlay message="جارٍ تجهيز ملف السجل..." />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-4 w-4" /> نسخة الحساب (ضمن لوحة التحكم)
          </div>
          <h1 className="text-3xl font-bold text-foreground">سجل العلامات الجانبي</h1>
          <p className="text-sm text-muted-foreground">احفظ التقويمات داخل حسابك ثم صدّر ملف Excel للطباعة.</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {lastUpdatedLabel && (
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1">
                <Clock className="h-4 w-4 text-primary" />
                آخر حفظ: {lastUpdatedLabel}
              </span>
            )}
            {savedGroupsCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                مجموعات محفوظة: {savedGroupsCount}
              </span>
            )}
            {selectedClassName && selectedDivision && (
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/60 px-3 py-1 text-accent-foreground">
                {selectedClassName} - {selectedDivision}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild className="gap-2">
            <Link href="/dashboard">
              <ArrowRight className="ml-2 h-4 w-4" /> العودة للوحة التحكم
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard/records">فتح إدارة السجلات</Link>
          </Button>
        </div>
      </div>

      <section className="space-y-6">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">إدخال التقويمات</CardTitle>
            <CardDescription>اختر الصف والشعبة ثم أدخل التقويمات واحفظها داخل حسابك.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 dark:bg-background/60">
              {isRecordsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ تحميل بيانات السجلات...
                </div>
              ) : isRecordsError ? (
                <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div>تعذر تحميل بيانات السجلات: {String((recordsError as any)?.message ?? "خطأ غير متوقع")}</div>
                  <Button asChild variant="outline" className="shrink-0">
                    <Link href="/dashboard/records">فتح إدارة السجلات</Link>
                  </Button>
                </div>
              ) : !settings || students.length === 0 ? (
                <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div>لا توجد بيانات طلبة داخل حسابك. اذهب إلى إدارة السجلات لإضافة البيانات.</div>
                  <Button asChild variant="outline" className="shrink-0">
                    <Link href="/dashboard/records">فتح إدارة السجلات</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[200px] space-y-2">
                      <Label>الصف</Label>
                      <Select value={selectedClassName} onValueChange={setSelectedClassName}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الصف" />
                        </SelectTrigger>
                        <SelectContent>
                          {classOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[200px] space-y-2">
                      <Label>الشعبة</Label>
                      <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الشعبة" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisionOptions.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={handleSaveGrades} disabled={isSavingGrades || !isDirty} className="gap-2">
                      {isSavingGrades ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      حفظ التقويمات
                    </Button>

                    {isDirty ? (
                      <div className="flex items-center gap-2 text-xs text-amber-700">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        تعديلات غير محفوظة
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BadgeCheck className="h-4 w-4 text-primary" />
                        محفوظ
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">عدد الطلبة: {activeStudents.length}</div>
                  </div>

                  <div className="overflow-auto rounded-xl border border-border/70">
                    <table className="w-full min-w-[1280px] border-collapse text-sm" style={{ direction: "rtl" }}>
                      <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground dark:bg-muted/20 dark:text-muted-foreground">
                        <tr>
                          <th className="border border-border/70 px-3 py-2" rowSpan={2}>
                            م
                          </th>
                          <th className="border border-border/70 px-3 py-2 text-right" rowSpan={2}>
                            اسم الطالب
                          </th>
                          <th className="border border-border/70 px-3 py-2">أ</th>
                          <th className="border border-border/70 px-3 py-2">ب</th>
                          <th className="border border-border/70 px-3 py-2">جـ</th>
                          <th className="border border-border/70 px-3 py-2">د</th>
                          <th className="border border-border/70 px-3 py-2">هـ</th>
                          <th className="border border-border/70 px-3 py-2">و</th>
                          <th className="border border-border/70 px-3 py-2">ز</th>
                          <th className="border border-border/70 px-3 py-2">حـ</th>
                          <th className="border border-border/70 px-3 py-2">ط</th>
                          <th className="border border-border/70 px-3 py-2">ي</th>
                          <th className="border border-border/70 px-3 py-2">النتيجة السنوية</th>
                          <th className="border border-border/70 px-3 py-2" rowSpan={2}>
                            ملحوظات
                          </th>
                        </tr>
                        <tr>
                          <th className="border border-border/70 px-3 py-2">التقويم الأول</th>
                          <th className="border border-border/70 px-3 py-2">التقويم الثاني</th>
                          <th className="border border-border/70 px-3 py-2">التقويم الثالث</th>
                          <th className="border border-border/70 px-3 py-2">الاختبار النهائي</th>
                          <th className="border border-border/70 px-3 py-2">المجموع</th>
                          <th className="border border-border/70 px-3 py-2">التقويم الأول</th>
                          <th className="border border-border/70 px-3 py-2">التقويم الثاني</th>
                          <th className="border border-border/70 px-3 py-2">التقويم الثالث</th>
                          <th className="border border-border/70 px-3 py-2">الاختبار النهائي</th>
                          <th className="border border-border/70 px-3 py-2">المجموع</th>
                          <th className="border border-border/70 px-3 py-2">المعدل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 dark:divide-border/40">
                        {activeStudents.map((s, i) => {
                          const g = activeGrades[s.id] ?? {};
                          const t1Values = [g.t1Eval1, g.t1Eval2, g.t1Eval3, g.t1Final].map((v) => normalizeGradeValue(v));
                          const t2Values = [g.t2Eval1 ?? g.eval1, g.t2Eval2 ?? g.eval2, g.t2Eval3 ?? g.eval3, g.t2Final ?? g.final].map((v) =>
                            normalizeGradeValue(v),
                          );
                          const t1Total = t1Values.reduce<number>((sum, v) => (v != null ? sum + v : sum), 0);
                          const t2Total = t2Values.reduce<number>((sum, v) => (v != null ? sum + v : sum), 0);
                          const t1Filled = t1Values.filter((v) => v != null).length;
                          const t2Filled = t2Values.filter((v) => v != null).length;
                          const annualValues = [...t1Values, ...t2Values].filter((v) => v != null) as number[];
                          const annualAvg = annualValues.length > 0 ? annualValues.reduce((sum, v) => sum + v, 0) / annualValues.length : null;

                          return (
                            <tr key={s.id} className="bg-white dark:bg-background">
                              <td className="border border-border/60 px-3 py-2 text-center text-xs font-medium text-muted-foreground">{i + 1}</td>
                              <td className="border border-border/60 px-3 py-2 text-sm font-medium text-foreground">{s.name}</td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={g.t1Eval1 ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t1Eval1: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={g.t1Eval2 ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t1Eval2: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={g.t1Eval3 ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t1Eval3: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={g.t1Final ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t1Final: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">{t1Filled > 0 ? t1Total : "—"}</td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={(g.t2Eval1 ?? g.eval1) ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t2Eval1: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={(g.t2Eval2 ?? g.eval2) ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t2Eval2: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={(g.t2Eval3 ?? g.eval3) ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t2Eval3: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input
                                  value={(g.t2Final ?? g.final) ?? ""}
                                  onChange={(e) => updateGrade(s.id, { t2Final: parseMark(e.target.value) })}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={100}
                                />
                              </td>
                              <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">{t2Filled > 0 ? t2Total : "—"}</td>
                              <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">
                                {annualAvg != null ? annualAvg.toFixed(2) : "—"}
                              </td>
                              <td className="border border-border/60 px-3 py-2">
                                <Input value={g.note ?? ""} onChange={(e) => updateGrade(s.id, { note: parseNote(e.target.value) })} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">تصدير وطباعة</CardTitle>
            <CardDescription>إنشاء ملف السجل ثم تنزيله أو طباعة نسخة مباشرة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSideLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ تحميل التقويمات المحفوظة...
              </div>
            ) : isSideError ? (
              <div className="text-sm text-muted-foreground">تعذر تحميل التقويمات: {String((sideError as any)?.message ?? "خطأ غير متوقع")}</div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button onClick={handleGenerate} disabled={isExporting || classes.length === 0 || students.length === 0} className="gap-2 sm:min-w-[220px]">
                <FileSpreadsheet className="ml-2 h-4 w-4" /> إنشاء ملف السجل
              </Button>
              <Button variant="outline" onClick={handleDownload} disabled={isExporting || classes.length === 0 || students.length === 0} className="gap-2 sm:min-w-[220px]">
                <Download className="ml-2 h-4 w-4" /> تنزيل كملف Excel
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2 sm:min-w-[220px]">
                <Printer className="ml-2 h-4 w-4" /> طباعة مباشرة
              </Button>
            </div>

            {lastExportId && (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                آخر ملف: {lastExportId}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
