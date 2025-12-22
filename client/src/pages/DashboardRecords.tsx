import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ClassSubjectManager } from "@/components/ClassSubjectManager";
import { ArrowRight, Loader2, Plus, Save, Trash2 } from "lucide-react";

type Subject = { id: string; name: string };
type Division = { id: string; division: string; subjects: Subject[] };
type ClassGroup = { className: string; divisions: Division[] };
type Student = {
  id: string;
  name: string;
  class: string;
  division: string;
  nationalId?: string;
  birthDate?: string;
  status?: string;
};

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
  source?: string;
  syncedAt?: string;
};

type RecordsResponse = {
  ok: true;
  record: { data: RecordsData; updatedAt: string } | null;
};

const normalizeText = (value: string) => value.trim();

const ensureDraftDefaults = (data: Partial<RecordsData> | null | undefined): RecordsData => {
  return {
    teacherName: data?.teacherName ?? "",
    directorate: data?.directorate ?? "",
    school: data?.school ?? "",
    town: data?.town ?? "",
    program: data?.program ?? "",
    year: data?.year ?? "",
    isHomeroom: Boolean(data?.isHomeroom),
    homeroomClass: data?.homeroomClass ?? "",
    schoolInfo: data?.schoolInfo,
    students: Array.isArray(data?.students) ? data!.students : [],
    classes: Array.isArray(data?.classes) ? data!.classes : [],
    source: data?.source,
    syncedAt: data?.syncedAt,
  };
};

export default function DashboardRecords() {
  const { toast } = useToast();
  const { data, isLoading, isError } = useQuery<RecordsResponse>({
    queryKey: ["/api/dashboard/records"],
    queryFn: getQueryFn<RecordsResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const [draft, setDraft] = useState<RecordsData>(() => ensureDraftDefaults(null));
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [search, setSearch] = useState("");

  const [newClassName, setNewClassName] = useState("");
  const [divisionClassName, setDivisionClassName] = useState("");
  const [newDivisionName, setNewDivisionName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set());
  const [openClassGroups, setOpenClassGroups] = useState<string[]>([]);
  const [hasInitializedClassGroups, setHasInitializedClassGroups] = useState(false);
  const [openDivisionGroups, setOpenDivisionGroups] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!data) return;
    setDraft(ensureDraftDefaults(data.record?.data ?? null));
    setSelectedStudentIds(new Set());
    setOpenClassGroups([]);
    setHasInitializedClassGroups(false);
    setOpenDivisionGroups({});
  }, [data]);

  useEffect(() => {
    if (draft.classes.length === 0) {
      if (divisionClassName) setDivisionClassName("");
      return;
    }

    if (!divisionClassName) {
      setDivisionClassName(draft.classes[0]!.className);
      return;
    }

    const normalizedSelected = normalizeText(divisionClassName);
    const exists = draft.classes.some((c) => normalizeText(c.className) === normalizedSelected);
    if (!exists) setDivisionClassName(draft.classes[0]!.className);
  }, [divisionClassName, draft.classes]);

  const stats = useMemo(() => {
    const classCount = draft.classes.length;
    const divisionCount = draft.classes.reduce((sum, c) => sum + (c.divisions?.length ?? 0), 0);
    const subjectCount = draft.classes.reduce(
      (sum, c) => sum + c.divisions.reduce((dSum, d) => dSum + (d.subjects?.length ?? 0), 0),
      0,
    );
    const studentCount = draft.students.length;
    return { classCount, divisionCount, subjectCount, studentCount };
  }, [draft.classes, draft.students.length]);

  const filteredStudents = useMemo(() => {
    const term = normalizeText(search).toLowerCase();
    if (!term) return draft.students;
    return draft.students.filter((student) => {
      const haystack = [student.name, student.class, student.division, student.nationalId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [draft.students, search]);

  const studentClassById = useMemo(() => {
    const map = new Map<string, string>();
    draft.students.forEach((student) => {
      map.set(student.id, normalizeText(student.class) || "غير محدد");
    });
    return map;
  }, [draft.students]);

  const filteredStudentIds = useMemo(() => filteredStudents.map((student) => student.id), [filteredStudents]);

  const selectedFilteredCount = useMemo(() => {
    if (filteredStudentIds.length === 0) return 0;
    let count = 0;
    filteredStudentIds.forEach((id) => {
      if (selectedStudentIds.has(id)) count += 1;
    });
    return count;
  }, [filteredStudentIds, selectedStudentIds]);

  const filteredSelectionState = useMemo(() => {
    if (filteredStudentIds.length === 0) return { checked: false as boolean | "indeterminate", disabled: true };
    if (selectedFilteredCount === 0) return { checked: false as boolean | "indeterminate", disabled: false };
    if (selectedFilteredCount === filteredStudentIds.length) return { checked: true as boolean | "indeterminate", disabled: false };
    return { checked: "indeterminate" as const, disabled: false };
  }, [filteredStudentIds.length, selectedFilteredCount]);

  const groupedStudents = useMemo(() => {
    const map = new Map<string, Student[]>();
    filteredStudents.forEach((student) => {
      const key = normalizeText(student.class) || "غير محدد";
      const bucket = map.get(key);
      if (bucket) bucket.push(student);
      else map.set(key, [student]);
    });

    const classOrder: string[] = [];
    draft.classes.forEach((cls) => {
      const name = normalizeText(cls.className);
      if (name && !classOrder.includes(name)) classOrder.push(name);
    });
    Array.from(map.keys()).forEach((name) => {
      if (!classOrder.includes(name)) classOrder.push(name);
    });

    const collator = new Intl.Collator("ar", { sensitivity: "base" });
    classOrder.forEach((className) => {
      const list = map.get(className);
      if (!list) return;
      list.sort((a, b) => {
        const byDivision = collator.compare(String(a.division ?? ""), String(b.division ?? ""));
        if (byDivision !== 0) return byDivision;
        return collator.compare(String(a.name ?? ""), String(b.name ?? ""));
      });
    });

    return classOrder
      .map((className) => ({ className, students: map.get(className) ?? [] }))
      .filter((entry) => entry.students.length > 0);
  }, [draft.classes, filteredStudents]);

  const groupedStudentsWithDivisions = useMemo(() => {
    const collator = new Intl.Collator("ar", { sensitivity: "base" });
    return groupedStudents.map((group) => {
      const divisionMap = new Map<string, Student[]>();
      group.students.forEach((student) => {
        const divisionName = normalizeText(student.division) || "بدون شعبة";
        const bucket = divisionMap.get(divisionName);
        if (bucket) bucket.push(student);
        else divisionMap.set(divisionName, [student]);
      });

      const divisions = Array.from(divisionMap.entries())
        .sort(([a], [b]) => collator.compare(a, b))
        .map(([divisionName, students]) => ({ divisionName, students }));

      return { ...group, divisions };
    });
  }, [groupedStudents]);

  useEffect(() => {
    const keys = groupedStudents.map((group) => group.className);
    if (!hasInitializedClassGroups) {
      setOpenClassGroups(keys.length > 0 ? [keys[0]!] : []);
      setHasInitializedClassGroups(true);
      return;
    }
    setOpenClassGroups((prev) => prev.filter((k) => keys.includes(k)));
  }, [groupedStudents, hasInitializedClassGroups]);

  useEffect(() => {
    setOpenDivisionGroups((prev) => {
      const next: Record<string, string[]> = {};
      groupedStudentsWithDivisions.forEach((group) => {
        const divisionKeys = group.divisions.map((d) => d.divisionName);
        const current = prev[group.className];

        if (current === undefined) {
          next[group.className] = divisionKeys.length > 0 ? [divisionKeys[0]!] : [];
          return;
        }

        next[group.className] = current.filter((value) => divisionKeys.includes(value));
      });
      return next;
    });
  }, [groupedStudentsWithDivisions]);

  const validateDraft = () => {
    const invalidStudent = draft.students.find(
      (s) => normalizeText(s.name) === "" || normalizeText(s.class) === "" || normalizeText(s.division) === "",
    );
    if (invalidStudent) {
      toast({
        title: "بيانات غير مكتملة",
        description: "تأكد من تعبئة اسم الطالب والصف والشعبة قبل الحفظ.",
        variant: "destructive",
      });
      return false;
    }

    const invalidClass = draft.classes.find((c) => normalizeText(c.className) === "");
    if (invalidClass) {
      toast({
        title: "بيانات غير مكتملة",
        description: "تأكد من أن أسماء الصفوف غير فارغة.",
        variant: "destructive",
      });
      return false;
    }

    const invalidDivision = draft.classes.flatMap((c) => c.divisions).find((d) => normalizeText(d.division) === "");
    if (invalidDivision) {
      toast({
        title: "بيانات غير مكتملة",
        description: "تأكد من أن أسماء الشعب غير فارغة.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const onSave = async () => {
    if (isSaving) return;
    if (!validateDraft()) return;
    setIsSaving(true);
    try {
      const { syncedAt: _syncedAt, ...payload } = draft;
      await apiRequest("PUT", "/api/dashboard/records", {
        ...payload,
        students: draft.students.map((s) => ({
          ...s,
          name: normalizeText(s.name),
          class: normalizeText(s.class),
          division: normalizeText(s.division),
          nationalId: s.nationalId ? normalizeText(s.nationalId) : s.nationalId,
          birthDate: s.birthDate ? normalizeText(s.birthDate) : s.birthDate,
          status: s.status ? normalizeText(s.status) : s.status,
        })),
        classes: draft.classes.map((c) => ({
          ...c,
          className: normalizeText(c.className),
          divisions: c.divisions.map((d) => ({
            ...d,
            division: normalizeText(d.division),
            subjects: Array.isArray(d.subjects) ? d.subjects : [],
          })),
        })),
        source: draft.source ?? "dashboard",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/records"] });
      toast({ title: "تم الحفظ", description: "تم حفظ السجلات في حسابك.", variant: "success" });
    } catch (err: any) {
      toast({
        title: "تعذر الحفظ",
        description: String(err?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onClear = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      await apiRequest("DELETE", "/api/dashboard/records");
      setDraft(ensureDraftDefaults(null));
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/records"] });
      toast({ title: "تم المسح", description: "تم حذف السجلات المخزنة لحسابك.", variant: "warning" });
    } catch (err: any) {
      toast({
        title: "تعذر المسح",
        description: String(err?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const addStudent = () => {
    const id = `student-${Date.now()}`;
    setDraft((prev) => ({
      ...prev,
      students: [
        {
          id,
          name: "",
          class: "",
          division: "",
          nationalId: "",
          birthDate: "",
          status: "",
        },
        ...prev.students,
      ],
    }));
  };

  const updateStudent = (id: string, patch: Partial<Student>) => {
    setDraft((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeStudent = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
    }));
    setSelectedStudentIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      if (filteredStudentIds.length === 0) return prev;
      const allSelected = filteredStudentIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        filteredStudentIds.forEach((id) => next.delete(id));
      } else {
        filteredStudentIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedStudentIds(new Set());

  const removeSelectedStudents = () => {
    setDraft((prev) => {
      const remaining = prev.students.filter((s) => !selectedStudentIds.has(s.id));
      return { ...prev, students: remaining };
    });
    setSelectedStudentIds(new Set());
  };

  const removeClassWithStudents = (className: string) => {
    const normalizedClass = normalizeText(className) || "غير محدد";
    setDraft((prev) => {
      const remainingStudents = prev.students.filter((student) => {
        const studentClass = normalizeText(student.class) || "غير محدد";
        return studentClass !== normalizedClass;
      });
      const remainingClasses = prev.classes.filter((cls) => normalizeText(cls.className) !== normalizedClass);
      return { ...prev, students: remainingStudents, classes: remainingClasses };
    });
    setSelectedStudentIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      Array.from(next).forEach((id) => {
        const studentClass = studentClassById.get(id) || "غير محدد";
        if (studentClass === normalizedClass) next.delete(id);
      });
      return next;
    });
    setDivisionClassName((prev) => (normalizeText(prev) === normalizedClass ? "" : prev));
  };

  const addClass = () => {
    const name = normalizeText(newClassName);
    if (!name) {
      toast({ title: "اسم الصف مطلوب", variant: "destructive" });
      return;
    }
    if (draft.classes.some((c) => c.className === name)) {
      toast({ title: "الصف موجود", description: "يوجد صف بنفس الاسم.", variant: "destructive" });
      return;
    }
    setDraft((prev) => ({ ...prev, classes: [...prev.classes, { className: name, divisions: [] }] }));
    setNewClassName("");
  };

  const addDivision = () => {
    const cls = normalizeText(divisionClassName);
    const div = normalizeText(newDivisionName);
    if (!cls || !div) {
      toast({ title: "بيانات الشعبة ناقصة", description: "اختر الصف وأدخل اسم الشعبة.", variant: "destructive" });
      return;
    }
    setDraft((prev) => {
      const classes = prev.classes.map((c) => {
        if (c.className !== cls) return c;
        if (c.divisions.some((d) => d.division === div)) return c;
        return {
          ...c,
          divisions: [...c.divisions, { id: `${cls}-${div}-${Date.now()}`, division: div, subjects: [] }],
        };
      });
      return { ...prev, classes };
    });
    setNewDivisionName("");
  };

  if (isLoading) {
    return (
      <div className="p-6" dir="rtl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جارٍ تحميل السجلات...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>تعذر تحميل السجلات</CardTitle>
            <CardDescription>حاول إعادة تحميل الصفحة</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة السجلات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.classCount} صف · {stats.divisionCount} شعبة · {stats.subjectCount} مادة · {stats.studentCount} طالب/ة
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild className="gap-2">
            <Link href="/dashboard">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للقائمة
            </Link>
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </Button>
          <Button variant="outline" onClick={onClear} disabled={isClearing} className="gap-2">
            {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            مسح
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مصدر البيانات</CardTitle>
          <CardDescription>
            {data.record?.data?.syncedAt ? `آخر مزامنة: ${data.record.data.syncedAt}` : "لا توجد مزامنة سابقة"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="teacherName">اسم المعلم</Label>
            <Input
              id="teacherName"
              value={draft.teacherName ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, teacherName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school">المدرسة</Label>
            <Input id="school" value={draft.school ?? ""} onChange={(e) => setDraft((p) => ({ ...p, school: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="directorate">المديرية</Label>
            <Input
              id="directorate"
              value={draft.directorate ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, directorate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="town">البلدة</Label>
            <Input id="town" value={draft.town ?? ""} onChange={(e) => setDraft((p) => ({ ...p, town: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="students" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">الطلاب</TabsTrigger>
          <TabsTrigger value="classes">الصفوف والمواد</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الطلاب</CardTitle>
              <CardDescription>تعديل الطلاب يتم محلياً ثم الحفظ إلى حسابك.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الصف أو الشعبة..." />
                <Button variant="secondary" onClick={addStudent} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة طالب
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filteredSelectionState.checked}
                    disabled={filteredSelectionState.disabled}
                    onCheckedChange={toggleSelectAllFiltered}
                  />
                  <span className="text-sm">تحديد الكل ({filteredStudents.length})</span>
                  {selectedStudentIds.size > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      محدد: {selectedStudentIds.size}
                      {search.trim() ? ` (ضمن البحث: ${selectedFilteredCount})` : ""}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={clearSelection} disabled={selectedStudentIds.size === 0}>
                    إلغاء التحديد
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={selectedStudentIds.size === 0} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        حذف المحدد
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف الطلاب المحددين</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف {selectedStudentIds.size} طالب/ة من السجلات الحالية. لا يمكن التراجع عن هذه العملية.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={removeSelectedStudents}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="overflow-x-auto">
                {groupedStudentsWithDivisions.length > 0 ? (
                  <Accordion type="multiple" value={openClassGroups} onValueChange={(value) => setOpenClassGroups(value)} className="space-y-4">
                    {groupedStudentsWithDivisions.map((group) => {
                      const groupIds = group.students.map((s) => s.id);
                      const groupSelectedCount = groupIds.reduce((count, id) => (selectedStudentIds.has(id) ? count + 1 : count), 0);
                      const groupCheckbox: boolean | "indeterminate" =
                        groupIds.length === 0
                          ? false
                          : groupSelectedCount === 0
                            ? false
                            : groupSelectedCount === groupIds.length
                              ? true
                              : "indeterminate";

                      const toggleGroup = () => {
                        setSelectedStudentIds((prev) => {
                          if (groupIds.length === 0) return prev;
                          const allSelected = groupIds.every((id) => prev.has(id));
                          const next = new Set(prev);
                          if (allSelected) groupIds.forEach((id) => next.delete(id));
                          else groupIds.forEach((id) => next.add(id));
                          return next;
                        });
                      };

                      return (
                        <AccordionItem key={group.className} value={group.className} className="border-none">
                          <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
                            <AccordionTrigger className="px-3 py-2 hover:no-underline border-b border-border/60">
                              <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                    <Checkbox checked={groupCheckbox} onCheckedChange={toggleGroup} />
                                  </div>
                                  <div className="font-semibold">{group.className}</div>
                                  <div className="text-xs text-muted-foreground">{group.students.length} طالب/ة</div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        حذف الصف بالكامل
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>حذف الصف بالكامل</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          سيتم حذف الصف "{group.className}" مع جميع الطلاب المرتبطين به. لا يمكن التراجع عن هذه العملية.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => removeClassWithStudents(group.className)}>حذف</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0 pt-0">
                              <div className="px-3 py-3">
                                <Accordion
                                  type="multiple"
                                  value={openDivisionGroups[group.className] ?? []}
                                  onValueChange={(value) =>
                                    setOpenDivisionGroups((prev) => ({
                                      ...prev,
                                      [group.className]: value,
                                    }))
                                  }
                                  className="space-y-2"
                                >
                                  {group.divisions.map((divisionGroup) => {
                                    const divisionIds = divisionGroup.students.map((s) => s.id);
                                    const divisionSelectedCount = divisionIds.reduce(
                                      (count, id) => (selectedStudentIds.has(id) ? count + 1 : count),
                                      0,
                                    );
                                    const divisionCheckbox: boolean | "indeterminate" =
                                      divisionIds.length === 0
                                        ? false
                                        : divisionSelectedCount === 0
                                          ? false
                                          : divisionSelectedCount === divisionIds.length
                                            ? true
                                            : "indeterminate";

                                    const toggleDivision = () => {
                                      setSelectedStudentIds((prev) => {
                                        if (divisionIds.length === 0) return prev;
                                        const allSelected = divisionIds.every((id) => prev.has(id));
                                        const next = new Set(prev);
                                        if (allSelected) divisionIds.forEach((id) => next.delete(id));
                                        else divisionIds.forEach((id) => next.add(id));
                                        return next;
                                      });
                                    };

                                    return (
                                      <AccordionItem
                                        key={`${group.className}::${divisionGroup.divisionName}`}
                                        value={divisionGroup.divisionName}
                                        className="rounded-lg border border-border/60 bg-muted/10 px-3"
                                      >
                                        <AccordionTrigger className="hover:no-underline">
                                          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                              <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                                <Checkbox checked={divisionCheckbox} onCheckedChange={toggleDivision} />
                                              </div>
                                              <div className="font-medium">الشعبة: {divisionGroup.divisionName}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {divisionGroup.students.length} طالب/ة
                                              </div>
                                            </div>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-3 pt-0">
                                          <div className="overflow-x-auto">
                                            <Table>
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead className="w-[1%]"></TableHead>
                                                  <TableHead className="text-right">الاسم</TableHead>
                                                  <TableHead className="text-right">الشعبة</TableHead>
                                                  <TableHead className="text-right">الرقم الوطني</TableHead>
                                                  <TableHead className="w-[1%]"></TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {divisionGroup.students.map((student) => (
                                                  <TableRow key={student.id}>
                                                    <TableCell>
                                                      <Checkbox
                                                        checked={selectedStudentIds.has(student.id)}
                                                        onCheckedChange={() => toggleStudentSelection(student.id)}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Input
                                                        value={student.name}
                                                        onChange={(e) => updateStudent(student.id, { name: e.target.value })}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Input
                                                        value={student.division}
                                                        onChange={(e) => updateStudent(student.id, { division: e.target.value })}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Input
                                                        value={student.nationalId ?? ""}
                                                        onChange={(e) => updateStudent(student.id, { nationalId: e.target.value })}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Button variant="ghost" size="icon" onClick={() => removeStudent(student.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    );
                                  })}
                                </Accordion>
                              </div>
                            </AccordionContent>
                          </div>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
                    لا يوجد طلاب مطابقون.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إضافة صف/شعبة</CardTitle>
              <CardDescription>يمكنك إضافة صفوف وشعب ثم إدارة المواد داخل كل شعبة.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newClass">إضافة صف جديد</Label>
                <div className="flex gap-2">
                  <Input id="newClass" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="مثال: الصف السابع" />
                  <Button variant="secondary" onClick={addClass} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>إضافة شعبة</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={divisionClassName} onValueChange={setDivisionClassName}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      {draft.classes.map((c) => (
                        <SelectItem key={c.className} value={c.className}>
                          {c.className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={newDivisionName} onChange={(e) => setNewDivisionName(e.target.value)} placeholder="مثال: أ" />
                </div>
                <Button variant="secondary" onClick={addDivision} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة شعبة
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الصفوف والمواد</CardTitle>
              <CardDescription>أضف المواد داخل كل شعبة ثم اضغط حفظ.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassSubjectManager
                classes={draft.classes}
                onUpdate={(classes) => setDraft((p) => ({ ...p, classes }))}
                students={draft.students}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
