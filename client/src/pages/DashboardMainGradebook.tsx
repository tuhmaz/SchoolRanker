import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { ArrowRight, BadgeCheck, Clock, Download, FileCheck, FileSpreadsheet, Loader2, Printer, Save, ShieldCheck } from "lucide-react";
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
  t1Eval4?: number | null;
  t1Note?: string | null;
  t2Eval1?: number | null;
  t2Eval2?: number | null;
  t2Eval3?: number | null;
  t2Eval4?: number | null;
  completion?: number | null;
  note?: string | null;
  eval1?: number | null;
  eval2?: number | null;
  eval3?: number | null;
  final?: number | null;
};

type MainGradebookState = {
  byGroup?: Record<string, { className?: string; division?: string; subject?: string; gradesByStudentId?: Record<string, StudentGrades> }>;
};

type MainGradebookResponse = {
  ok: true;
  mainGradebook: MainGradebookState | null;
  updatedAt: string | null;
};

const normalizeText = (value: unknown) => {
  const text = value != null ? String(value).trim() : "";
  return text;
};

const buildGroupKey = (className: string, division: string, subject: string) =>
  `${normalizeText(className) || "غير محدد"}|||${normalizeText(division) || "بدون شعبة"}|||${normalizeText(subject) || "غير محدد"}`;

const normalizeGradeValue = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const normalizeNoteValue = (value: unknown) => {
  const text = value != null ? String(value).trim() : "";
  return text.length > 0 ? text : null;
};

const normalizeStoredGrades = (value: unknown): StudentGrades => {
  const raw = value as any;
  return {
    t1Eval1: normalizeGradeValue(raw?.t1Eval1),
    t1Eval2: normalizeGradeValue(raw?.t1Eval2),
    t1Eval3: normalizeGradeValue(raw?.t1Eval3),
    t1Eval4: normalizeGradeValue(raw?.t1Eval4),
    t1Note: normalizeNoteValue(raw?.t1Note),
    t2Eval1: normalizeGradeValue(raw?.t2Eval1 ?? raw?.eval1),
    t2Eval2: normalizeGradeValue(raw?.t2Eval2 ?? raw?.eval2),
    t2Eval3: normalizeGradeValue(raw?.t2Eval3 ?? raw?.eval3),
    t2Eval4: normalizeGradeValue(raw?.t2Eval4 ?? raw?.final),
    completion: normalizeGradeValue(raw?.completion),
    note: normalizeNoteValue(raw?.note),
  };
};

const gradesEqual = (a: StudentGrades | undefined, b: StudentGrades | undefined) => {
  const a1 = normalizeGradeValue(a?.t1Eval1);
  const a2 = normalizeGradeValue(a?.t1Eval2);
  const a3 = normalizeGradeValue(a?.t1Eval3);
  const a4 = normalizeGradeValue(a?.t1Eval4);
  const a5 = normalizeNoteValue(a?.t1Note);
  const a6 = normalizeGradeValue(a?.t2Eval1 ?? a?.eval1);
  const a7 = normalizeGradeValue(a?.t2Eval2 ?? a?.eval2);
  const a8 = normalizeGradeValue(a?.t2Eval3 ?? a?.eval3);
  const a9 = normalizeGradeValue(a?.t2Eval4 ?? a?.final);
  const a10 = normalizeGradeValue(a?.completion);
  const a11 = normalizeNoteValue(a?.note);

  const b1 = normalizeGradeValue(b?.t1Eval1);
  const b2 = normalizeGradeValue(b?.t1Eval2);
  const b3 = normalizeGradeValue(b?.t1Eval3);
  const b4 = normalizeGradeValue(b?.t1Eval4);
  const b5 = normalizeNoteValue(b?.t1Note);
  const b6 = normalizeGradeValue(b?.t2Eval1 ?? b?.eval1);
  const b7 = normalizeGradeValue(b?.t2Eval2 ?? b?.eval2);
  const b8 = normalizeGradeValue(b?.t2Eval3 ?? b?.eval3);
  const b9 = normalizeGradeValue(b?.t2Eval4 ?? b?.final);
  const b10 = normalizeGradeValue(b?.completion);
  const b11 = normalizeNoteValue(b?.note);

  return (
    a1 === b1 &&
    a2 === b2 &&
    a3 === b3 &&
    a4 === b4 &&
    a5 === b5 &&
    a6 === b6 &&
    a7 === b7 &&
    a8 === b8 &&
    a9 === b9 &&
    a10 === b10 &&
    a11 === b11
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

type TemplatePreference = "auto" | "lower" | "upper";

export default function DashboardMainGradebook() {
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
    data: mainRes,
    isLoading: isMainLoading,
    isError: isMainError,
    error: mainError,
  } = useQuery<MainGradebookResponse>({
    queryKey: ["/api/dashboard/main-gradebook"],
    queryFn: getQueryFn<MainGradebookResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const settings = recordsRes?.record?.data ?? null;
  const classes = settings?.classes ?? [];
  const students = settings?.students ?? [];

  const lastUpdatedLabel = useMemo(() => {
    const updatedAt = recordsRes?.record?.updatedAt;
    if (!updatedAt) return null;
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return updatedAt;
    return date.toLocaleString("ar", { hour12: true });
  }, [recordsRes?.record?.updatedAt]);

  const [templatePreference, setTemplatePreference] = useState<TemplatePreference>("auto");
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(() => new Set());

  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [draftByGroup, setDraftByGroup] = useState<Record<string, Record<string, StudentGrades>>>({});
  const [savedByGroup, setSavedByGroup] = useState<Record<string, Record<string, StudentGrades>>>({});
  const [dirtyCountByGroup, setDirtyCountByGroup] = useState<Record<string, number>>({});

  useEffect(() => {
    const next = new Set<string>();
    classes.forEach((c) => {
      const key = normalizeText(c.className) || "غير محدد";
      next.add(key);
    });
    setSelectedClasses(next);
  }, [classes]);

  const classStats = useMemo(() => {
    const countByClass = new Map<string, number>();
    students.forEach((s) => {
      const key = normalizeText(s.class) || "غير محدد";
      countByClass.set(key, (countByClass.get(key) ?? 0) + 1);
    });
    return countByClass;
  }, [students]);

  const selectedClassesCount = useMemo(() => selectedClasses.size, [selectedClasses]);

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

  const subjectOptions = useMemo(() => {
    const cls = normalizeText(selectedClassName) || "غير محدد";
    const div = normalizeText(selectedDivision) || "بدون شعبة";
    const subjects =
      classes
        .filter((c) => (normalizeText(c.className) || "غير محدد") === cls)
        .flatMap((c) =>
          (c.divisions ?? [])
            .filter((d) => (normalizeText((d as any)?.division) || "بدون شعبة") === div)
            .flatMap((d) => (d.subjects ?? []).map((s) => normalizeText((s as any)?.name)).filter(Boolean)),
        ) ?? [];
    return Array.from(new Set(subjects)).sort((a, b) => a.localeCompare(b, "ar", { sensitivity: "base" }));
  }, [classes, selectedClassName, selectedDivision]);

  useEffect(() => {
    if (hasHydrated) return;
    if (!mainRes) return;

    const byGroup = mainRes.mainGradebook?.byGroup;
    const next: Record<string, Record<string, StudentGrades>> = {};

    if (byGroup && typeof byGroup === "object") {
      Object.entries(byGroup).forEach(([key, group]) => {
        const grades = (group as any)?.gradesByStudentId;
        if (grades && typeof grades === "object") {
          const normalized: Record<string, StudentGrades> = {};
          Object.entries(grades as any).forEach(([studentId, rawGrades]) => {
            normalized[String(studentId)] = normalizeStoredGrades(rawGrades);
          });
          next[key] = normalized;
        }
      });
    }

    setDraftByGroup(next);
    setSavedByGroup(next);
    setDirtyCountByGroup(Object.fromEntries(Object.keys(next).map((key) => [key, 0])));
    setHasHydrated(true);
  }, [hasHydrated, mainRes]);

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

  useEffect(() => {
    if (!selectedSubject && subjectOptions.length > 0) {
      setSelectedSubject(subjectOptions[0]!);
      return;
    }
    if (selectedSubject && subjectOptions.length > 0 && !subjectOptions.includes(selectedSubject)) {
      setSelectedSubject(subjectOptions[0]!);
    }
  }, [selectedSubject, subjectOptions]);

  const filteredClasses = useMemo(() => {
    if (classes.length === 0) return [];
    return classes.filter((c) => selectedClasses.has(normalizeText(c.className) || "غير محدد"));
  }, [classes, selectedClasses]);

  const filteredStudents = useMemo(() => {
    if (students.length === 0) return [];
    return students.filter((s) => selectedClasses.has(normalizeText(s.class) || "غير محدد"));
  }, [students, selectedClasses]);

  const [isExporting, setIsExporting] = useState(false);
  const [showExportOverlay, setShowExportOverlay] = useState(false);
  const [lastExportId, setLastExportId] = useState<string | null>(null);

  const lastSavedLabel = useMemo(() => {
    if (!mainRes?.updatedAt) return null;
    const date = new Date(mainRes.updatedAt);
    if (Number.isNaN(date.getTime())) return mainRes.updatedAt;
    return date.toLocaleString("ar", { hour12: true });
  }, [mainRes?.updatedAt]);

  const activeGroupKey = useMemo(() => buildGroupKey(selectedClassName, selectedDivision, selectedSubject), [selectedClassName, selectedDivision, selectedSubject]);

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

  const parseMark = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
  };

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

  const saveGrades = async (mode: "manual" | "auto") => {
    if (isSavingGrades) return;
    if (!settings) return;
    if (!selectedClassName || !selectedDivision || !selectedSubject) return;
    if (activeStudents.length === 0) return;

    setIsSavingGrades(true);
    try {
      const payloadGrades: Record<string, StudentGrades> = {};
      activeStudents.forEach((s) => {
        payloadGrades[s.id] = activeGrades[s.id] ?? {};
      });

      await apiRequest("PUT", "/api/dashboard/main-gradebook", {
        className: normalizeText(selectedClassName) || "غير محدد",
        division: normalizeText(selectedDivision) || "بدون شعبة",
        subject: normalizeText(selectedSubject) || "غير محدد",
        gradesByStudentId: payloadGrades,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/main-gradebook"] });
      setDraftByGroup((prev) => ({ ...prev, [activeGroupKey]: payloadGrades }));
      setSavedByGroup((prev) => ({ ...prev, [activeGroupKey]: payloadGrades }));
      setDirtyCountByGroup((prev) => ({ ...prev, [activeGroupKey]: 0 }));

      if (mode === "manual") {
        toast({ title: "تم الحفظ", description: "تم حفظ التقويمات داخل حسابك.", variant: "success" });
      }
    } catch (e: any) {
      toast({ title: "تعذر الحفظ", description: String(e?.message ?? "حدث خطأ غير متوقع"), variant: "destructive" });
    } finally {
      setIsSavingGrades(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isDirty) return;
    if (!selectedClassName || !selectedDivision || !selectedSubject) return;
    if (activeStudents.length === 0) return;
    const handle = window.setTimeout(() => {
      if (!isDirty) return;
      saveGrades("auto");
    }, 1200);
    return () => window.clearTimeout(handle);
  }, [activeGroupKey, activeGrades, activeStudents.length, hasHydrated, isDirty, selectedClassName, selectedDivision, selectedSubject]);

  const buildExportRequestBody = () => {
    const pref = templatePreference === "auto" ? undefined : templatePreference;
    return JSON.stringify({
      teacherName: settings?.teacherName,
      directorate: settings?.directorate,
      school: settings?.school,
      town: settings?.town,
      program: settings?.program,
      year: settings?.year,
      isHomeroom: settings?.isHomeroom,
      homeroomClass: settings?.homeroomClass,
      templatePreference: pref,
      classes: filteredClasses,
      students: filteredStudents,
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

  const requestExport = async () => {
    const res = await fetch("/api/export/main-gradebook", {
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
    if (selectedClasses.size === 0) {
      toast({ title: "لم يتم اختيار صفوف", description: "اختر صفاً واحداً على الأقل قبل التصدير.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setShowExportOverlay(true);
    try {
      const data = await requestExport();
      const id = String(data.id || "");
      setLastExportId(id || null);
      toast({ title: "تم إنشاء الدفتر", description: `تم تجهيز الملف: ${data.filename ?? ""}`.trim(), variant: "success" });
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
    if (selectedClasses.size === 0) {
      toast({ title: "لم يتم اختيار صفوف", description: "اختر صفاً واحداً على الأقل قبل التصدير.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setShowExportOverlay(true);
    try {
      const data = await requestExport();
      const id = String(data.id || "");
      setLastExportId(id || null);
      if (id) {
        window.open(`/api/export/main-gradebook?id=${encodeURIComponent(id)}`, "_blank");
      }
    } catch (e: any) {
      toast({ title: "تعذر التنزيل", description: String(e?.message ?? "حدث خطأ غير متوقع"), variant: "destructive" });
    } finally {
      setShowExportOverlay(false);
      setIsExporting(false);
    }
  };

  const selectAll = () => {
    setSelectedClasses(new Set(classes.map((c) => normalizeText(c.className) || "غير محدد")));
  };

  const selectNone = () => setSelectedClasses(new Set());

  const toggleClass = (key: string) => {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6" dir="rtl">
      {showExportOverlay && <LoadingOverlay message="جارٍ تجهيز ملف الدفتر..." />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-4 w-4" /> نسخة الحساب (ضمن لوحة التحكم)
          </div>
          <h1 className="text-3xl font-bold text-foreground">دفتر العلامات الرئيسي</h1>
          <p className="text-sm text-muted-foreground">اختر الصفوف ثم صدّر دفتر العلامات الرئيسي للطباعة.</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {lastUpdatedLabel && (
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1">
                <Clock className="h-4 w-4 text-primary" />
                آخر تحديث: {lastUpdatedLabel}
              </span>
            )}
            {selectedClassesCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1">
                <FileCheck className="h-4 w-4 text-primary" />
                صفوف مختارة: {selectedClassesCount}
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
            <CardTitle className="text-xl">خيارات الدفتر</CardTitle>
            <CardDescription>حدد القالب ونطاق الصفوف التي سيتم تضمينها داخل ملف Excel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>اختيار القالب</Label>
                    <Select value={templatePreference} onValueChange={(v) => setTemplatePreference(v as TemplatePreference)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القالب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">تلقائي</SelectItem>
                        <SelectItem value="lower">روضة - ثالث</SelectItem>
                        <SelectItem value="upper">رابع - ثاني ثانوي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>إجراءات سريعة</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={selectAll} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        تحديد الكل
                      </Button>
                      <Button type="button" variant="outline" onClick={selectNone}>
                        إلغاء الكل
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/80 p-4 dark:bg-background/60">
                  <div className="mb-3 text-sm font-medium text-foreground">الصفوف</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {classes.map((c) => {
                      const key = normalizeText(c.className) || "غير محدد";
                      const checked = selectedClasses.has(key);
                      const count = classStats.get(key) ?? 0;
                      return (
                        <label
                          key={key}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={checked} onCheckedChange={() => toggleClass(key)} />
                            <span className="font-medium text-foreground">{key}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{count} طالب</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">إدخال التقويمات</CardTitle>
            <CardDescription>اختر الصف والشعبة والمادة ثم أدخل العلامات وسيتم حفظها تلقائياً.</CardDescription>
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
                  {isMainLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ تحميل التقويمات المحفوظة...
                    </div>
                  ) : isMainError ? (
                    <div className="text-sm text-muted-foreground">تعذر تحميل التقويمات: {String((mainError as any)?.message ?? "خطأ غير متوقع")}</div>
                  ) : null}

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

                    <div className="min-w-[240px] space-y-2">
                      <Label>المادة</Label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={() => saveGrades("manual")} disabled={isSavingGrades || !isDirty} className="gap-2">
                      {isSavingGrades ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      حفظ الآن
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
                    {lastSavedLabel && <div className="text-xs text-muted-foreground">آخر حفظ: {lastSavedLabel}</div>}
                  </div>

                  {subjectOptions.length === 0 ? (
                    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      لا توجد مواد معرفة لهذا الصف/الشعبة داخل إدارة السجلات.
                    </div>
                  ) : activeStudents.length === 0 ? (
                    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      لا توجد أسماء طلبة ضمن الصف/الشعبة المحددة.
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-xl border border-border/70">
                      <table className="w-full min-w-[1240px] border-collapse text-sm" style={{ direction: "rtl" }}>
                        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground dark:bg-muted/20 dark:text-muted-foreground">
                          <tr>
                            <th className="border border-border/70 px-3 py-2" rowSpan={2}>
                              م
                            </th>
                            <th className="border border-border/70 px-3 py-2 text-right" rowSpan={2}>
                              اسم الطالب
                            </th>
                            <th className="border border-border/70 px-3 py-2 text-center" colSpan={5}>
                              الفصل الدراسي الأول
                            </th>
                            <th className="border border-border/70 px-3 py-2 text-center" colSpan={5}>
                              الفصل الدراسي الثاني
                            </th>
                            <th className="border border-border/70 px-3 py-2 text-center" rowSpan={2}>
                              النتيجة السنوية
                            </th>
                          </tr>
                          <tr>
                            <th className="border border-border/70 px-3 py-2">أ</th>
                            <th className="border border-border/70 px-3 py-2">ب</th>
                            <th className="border border-border/70 px-3 py-2">ج</th>
                            <th className="border border-border/70 px-3 py-2">د</th>
                            <th className="border border-border/70 px-3 py-2">هـ</th>
                            <th className="border border-border/70 px-3 py-2">و</th>
                            <th className="border border-border/70 px-3 py-2">ز</th>
                            <th className="border border-border/70 px-3 py-2">ح</th>
                            <th className="border border-border/70 px-3 py-2">ط</th>
                            <th className="border border-border/70 px-3 py-2">ي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 dark:divide-border/40">
                          {activeStudents.map((s, i) => {
                            const g = activeGrades[s.id] ?? {};
                            const t1 = [g.t1Eval1, g.t1Eval2, g.t1Eval3, g.t1Eval4].map((v) => normalizeGradeValue(v));
                            const t2 = [g.t2Eval1, g.t2Eval2, g.t2Eval3, g.t2Eval4].map((v) => normalizeGradeValue(v));
                            const t1Result =
                              t1.every((v) => v != null) ? Math.max(0, Math.min(100, t1.reduce((sum, v) => sum + (v ?? 0), 0))) : null;
                            const t2Result =
                              t2.every((v) => v != null) ? Math.max(0, Math.min(100, t2.reduce((sum, v) => sum + (v ?? 0), 0))) : null;
                            const annual =
                              t1Result != null && t2Result != null ? Math.max(0, Math.min(100, Math.round((t1Result + t2Result) / 2))) : null;

                            return (
                              <tr key={s.id} className="bg-white dark:bg-background">
                                <td className="border border-border/60 px-3 py-2 text-center text-xs font-medium text-muted-foreground">{i + 1}</td>
                                <td className="border border-border/60 px-3 py-2 text-sm font-medium text-foreground">{s.name}</td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t1Eval1 ?? ""} onChange={(e) => updateGrade(s.id, { t1Eval1: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t1Eval2 ?? ""} onChange={(e) => updateGrade(s.id, { t1Eval2: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t1Eval3 ?? ""} onChange={(e) => updateGrade(s.id, { t1Eval3: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t1Eval4 ?? ""} onChange={(e) => updateGrade(s.id, { t1Eval4: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">{t1Result != null ? t1Result : "—"}</td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t2Eval1 ?? ""} onChange={(e) => updateGrade(s.id, { t2Eval1: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t2Eval2 ?? ""} onChange={(e) => updateGrade(s.id, { t2Eval2: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t2Eval3 ?? ""} onChange={(e) => updateGrade(s.id, { t2Eval3: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2">
                                  <Input value={g.t2Eval4 ?? ""} onChange={(e) => updateGrade(s.id, { t2Eval4: parseMark(e.target.value) })} type="number" inputMode="numeric" min={0} max={100} />
                                </td>
                                <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">{t2Result != null ? t2Result : "—"}</td>
                                <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">{annual != null ? annual : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">تصدير وطباعة</CardTitle>
            <CardDescription>إنشاء ملف الدفتر ثم تنزيله أو طباعة نسخة مباشرة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button onClick={handleGenerate} disabled={isExporting || !settings || classes.length === 0 || students.length === 0} className="gap-2 sm:min-w-[220px]">
                <FileSpreadsheet className="ml-2 h-4 w-4" /> إنشاء ملف الدفتر
              </Button>
              <Button variant="outline" onClick={handleDownload} disabled={isExporting || !settings || classes.length === 0 || students.length === 0} className="gap-2 sm:min-w-[220px]">
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
