import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarDays, ClipboardList, Download, Loader2, RotateCcw, Sparkles, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StoredStudent {
  id: string;
  name: string;
  class: string;
  division: string;
}

interface StoredSettings {
  directorate?: string;
  school?: string;
  teacherName?: string;
  program?: string;
  town?: string;
  year?: string;
  classes?: {
    className: string;
    divisions: {
      id: string;
      division: string;
      subjects?: { id: string; name: string }[];
    }[];
  }[];
  students?: StoredStudent[];
}

interface DivisionOption {
  id: string;
  label: string;
  className: string;
  division: string;
  subjects: { id: string; name: string }[];
  students: StoredStudent[];
}

interface LessonConfig {
  name: string;
  divisionId: string;
  subjectId?: string;
  presentById: Record<string, boolean>;
  active: boolean;
}

const MAX_LESSONS = 7;

const LESSON_DEFAULTS = [
  "الحصة الأولى",
  "الحصة الثانية",
  "الحصة الثالثة",
  "الحصة الرابعة",
  "الحصة الخامسة",
  "الحصة السادسة",
  "الحصة السابعة",
];

const DAY_OPTIONS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

const LESSON_CARD_VARIANTS = [
  {
    card: "border border-sky-200/70 dark:border-sky-800/70 shadow-sm bg-sky-50/40 dark:bg-sky-500/10",
    header: "bg-sky-500/10 dark:bg-sky-500/20 border-b border-sky-200/60 dark:border-sky-700/40",
    summary: "bg-sky-100/60 dark:bg-sky-500/15",
    tableHead: "bg-sky-500/10 dark:bg-sky-500/20",
    accent: "text-sky-700 dark:text-sky-300",
  },
  {
    card: "border border-amber-200/70 dark:border-amber-800/60 shadow-sm bg-amber-50/40 dark:bg-amber-500/10",
    header: "bg-amber-500/15 dark:bg-amber-500/20 border-b border-amber-200/60 dark:border-amber-700/40",
    summary: "bg-amber-100/60 dark:bg-amber-500/15",
    tableHead: "bg-amber-500/15 dark:bg-amber-500/20",
    accent: "text-amber-700 dark:text-amber-300",
  },
  {
    card: "border border-emerald-200/70 dark:border-emerald-800/60 shadow-sm bg-emerald-50/40 dark:bg-emerald-500/10",
    header: "bg-emerald-500/10 dark:bg-emerald-500/20 border-b border-emerald-200/60 dark:border-emerald-700/40",
    summary: "bg-emerald-100/60 dark:bg-emerald-500/15",
    tableHead: "bg-emerald-500/10 dark:bg-emerald-500/20",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  {
    card: "border border-violet-200/70 dark:border-violet-800/60 shadow-sm bg-violet-50/40 dark:bg-violet-500/10",
    header: "bg-violet-500/10 dark:bg-violet-500/20 border-b border-violet-200/60 dark:border-violet-700/40",
    summary: "bg-violet-100/60 dark:bg-violet-500/15",
    tableHead: "bg-violet-500/10 dark:bg-violet-500/20",
    accent: "text-violet-700 dark:text-violet-300",
  },
  {
    card: "border border-rose-200/70 dark:border-rose-800/60 shadow-sm bg-rose-50/40 dark:bg-rose-500/10",
    header: "bg-rose-500/10 dark:bg-rose-500/20 border-b border-rose-200/60 dark:border-rose-700/40",
    summary: "bg-rose-100/60 dark:bg-rose-500/15",
    tableHead: "bg-rose-500/10 dark:bg-rose-500/20",
    accent: "text-rose-700 dark:text-rose-300",
  },
];

export default function LessonAttendancePage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [day, setDay] = useState<string>(DAY_OPTIONS[0]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [teacherName, setTeacherName] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [lessonConfigs, setLessonConfigs] = useState<LessonConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | undefined>("lesson-1");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("appSettings");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSettings;
      setSettings(parsed);
      if (parsed.teacherName) {
        setTeacherName(parsed.teacherName);
      }
    } catch (error: any) {
      toast({
        title: "تعذر تحميل البيانات",
        description: error?.message || "لم نتمكن من قراءة التجهيزات المحفوظة",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const today = new Date();
    const arabicDay = DAY_OPTIONS[Math.min(today.getDay(), DAY_OPTIONS.length - 1)];
    setDay(arabicDay);
    setDate(today.toISOString().slice(0, 10));
  }, []);

  const divisionOptions = useMemo<DivisionOption[]>(() => {
    if (!settings?.classes) return [];
    const students = settings.students ?? [];

    return settings.classes.flatMap((group) =>
      group.divisions.map((div) => {
        const compoundId = div.id || `${group.className}-${div.division}`;
        const attachedStudents = students
          .filter(
            (student) =>
              `${student.class}-${student.division}` === compoundId ||
              (student.class === group.className && student.division === div.division),
          )
          .sort((a, b) => a.name.localeCompare(b.name, "ar", { sensitivity: "base" }));

        return {
          id: compoundId,
          label: `${group.className} - ${div.division}`,
          className: group.className,
          division: div.division,
          subjects: Array.isArray(div.subjects) ? div.subjects : [],
          students: attachedStudents,
        } satisfies DivisionOption;
      }),
    );
  }, [settings]);

  const divisionMap = useMemo(() => new Map(divisionOptions.map((option) => [option.id, option])), [divisionOptions]);

  useEffect(() => {
    if (divisionOptions.length === 0) {
      setLessonConfigs(Array.from({ length: MAX_LESSONS }, (_, idx) => ({
        name: LESSON_DEFAULTS[idx] ?? `حصة ${idx + 1}`,
        divisionId: "",
        presentById: {},
        active: idx === 0,
      })));
      return;
    }

    setLessonConfigs((prev) => {
      const next = Array.from({ length: MAX_LESSONS }, (_, idx) => {
        const existing = prev[idx];
        let division = existing?.divisionId ? divisionMap.get(existing.divisionId) : undefined;
        if (!division) {
          division = divisionOptions[Math.min(idx, divisionOptions.length - 1)] ?? divisionOptions[0];
        }

        const students = division?.students ?? [];
        const presentById: Record<string, boolean> = {};
        students.forEach((student) => {
          presentById[student.id] = existing?.presentById?.[student.id] ?? true;
        });

        const subjectId =
          existing?.subjectId && division?.subjects.some((subject) => subject.id === existing.subjectId)
            ? existing.subjectId
            : division?.subjects[0]?.id;

        return {
          name: existing?.name ?? LESSON_DEFAULTS[idx] ?? `حصة ${idx + 1}`,
          divisionId: division?.id ?? "",
          subjectId,
          presentById,
          active: existing?.active ?? idx === 0,
        } satisfies LessonConfig;
      });
      return next;
    });
  }, [divisionOptions, divisionMap]);

  const updateLesson = (index: number, updater: (prev: LessonConfig) => LessonConfig) => {
    setLessonConfigs((prev) => {
      const clone = [...prev];
      const current = prev[index] ?? {
        name: LESSON_DEFAULTS[index] ?? `حصة ${index + 1}`,
        divisionId: "",
        presentById: {},
        active: index === 0,
      };
      clone[index] = updater(current);
      return clone;
    });
  };

  const handleDivisionChange = (index: number, divisionId: string) => {
    const division = divisionMap.get(divisionId);
    const students = division?.students ?? [];
    updateLesson(index, (prev) => {
      const presentById: Record<string, boolean> = {};
      students.forEach((student) => {
        presentById[student.id] = prev.presentById?.[student.id] ?? true;
      });
      const subjectId =
        prev.subjectId && division?.subjects.some((subject) => subject.id === prev.subjectId)
          ? prev.subjectId
          : division?.subjects[0]?.id;
      return {
        ...prev,
        divisionId,
        subjectId,
        presentById,
        active: true,
      };
    });
    setAccordionValue(`lesson-${index + 1}`);
  };

  const handleSubjectChange = (index: number, subjectId: string) => {
    updateLesson(index, (prev) => ({
      ...prev,
      subjectId,
    }));
  };

  const handleNameChange = (index: number, name: string) => {
    updateLesson(index, (prev) => ({
      ...prev,
      name,
    }));
  };

  const toggleStudentPresence = (index: number, studentId: string) => {
    updateLesson(index, (prev) => ({
      ...prev,
      presentById: {
        ...prev.presentById,
        [studentId]: !(prev.presentById?.[studentId] ?? true),
      },
    }));
  };

  const toggleLessonActive = (index: number) => {
    updateLesson(index, (prev) => ({
      ...prev,
      active: !prev.active,
    }));
  };

  const markLessonStudents = (index: number, present: boolean) => {
    const division = divisionMap.get(lessonConfigs[index]?.divisionId ?? "");
    const students = division?.students ?? [];
    updateLesson(index, (prev) => {
      const presentById = { ...prev.presentById };
      students.forEach((student) => {
        presentById[student.id] = present;
      });
      return {
        ...prev,
        presentById,
      };
    });
  };

  const resetAllLessons = () => {
    setLessonConfigs((prev) =>
      prev.map((lesson, index) => {
        const division = divisionMap.get(lesson.divisionId);
        const students = division?.students ?? [];
        const presentById: Record<string, boolean> = {};
        students.forEach((student) => {
          presentById[student.id] = true;
        });
        return {
          ...lesson,
          name: LESSON_DEFAULTS[index] ?? lesson.name,
          presentById,
        };
      }),
    );
    toast({
      title: "تمت إعادة التعيين",
      description: "تم ضبط جميع الحصص على حالة الحضور",
    });
  };

  const lessonSummaries = useMemo(() => {
    return lessonConfigs.map((lesson, index) => {
      const division = divisionMap.get(lesson.divisionId);
      const students = division?.students ?? [];
      const absentNames = students
        .filter((student) => lesson.presentById?.[student.id] === false)
        .map((student) => student.name);
      return {
        index,
        name: lesson.name?.trim() || LESSON_DEFAULTS[index] || `حصة ${index + 1}`,
        classLabel: division ? `${division.className} - ${division.division}` : "—",
        subjectName: division?.subjects.find((subject) => subject.id === lesson.subjectId)?.name ?? "",
        presentCount: students.length - absentNames.length,
        absentCount: absentNames.length,
        absentNames,
      };
    });
  }, [lessonConfigs, divisionMap]);

  const activeSummaries = useMemo(
    () => lessonSummaries.filter((summary) => lessonConfigs[summary.index]?.active),
    [lessonSummaries, lessonConfigs],
  );

  const totalStudentsTracked = useMemo(
    () =>
      activeSummaries.reduce(
        (sum, summary) => sum + summary.presentCount + summary.absentCount,
        0,
      ),
    [activeSummaries],
  );

  const totalAbsentStudents = useMemo(
    () => activeSummaries.reduce((sum, summary) => sum + summary.absentCount, 0),
    [activeSummaries],
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat("ar-EG"), []);

  const handleGenerate = async () => {
    if (!settings) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تجهيز البيانات من صفحة التجهيزات أولاً",
        variant: "destructive",
      });
      return;
    }

    const validLessons = lessonConfigs.filter((lesson) => lesson.divisionId && divisionMap.has(lesson.divisionId));
    if (validLessons.length === 0) {
      toast({
        title: "لا توجد حصص",
        description: "يرجى اختيار صف وشعبة لكل حصة قبل التصدير",
        variant: "destructive",
      });
      return;
    }

    if (!day || !date) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تحديد اليوم والتاريخ",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setDownloadInfo(null);

      const unionStudents = new Map<string, StoredStudent>();
      const lessonsPayload = lessonConfigs.map((lesson, index) => {
        const division = divisionMap.get(lesson.divisionId);
        if (!division) return null;
        if (!lesson.active) return null;

        const students = division.students;
        students.forEach((student) => unionStudents.set(student.id, student));

        const studentIds = students.map((student) => student.id);
        const absentStudentIds = students
          .filter((student) => lesson.presentById?.[student.id] === false)
          .map((student) => student.id);

        const attendance = students.map((student) => ({
          studentId: student.id,
          status: lesson.presentById?.[student.id] === false ? "absent" : "present",
        }));

        const subjectName = division.subjects.find((subject) => subject.id === lesson.subjectId)?.name ?? undefined;

        return {
          id: `lesson-${index + 1}`,
          name: lesson.name?.trim() || LESSON_DEFAULTS[index] || `حصة ${index + 1}`,
          className: division.className,
          division: division.division,
          subject: subjectName,
          studentIds,
          absentStudentIds,
          attendance,
          teacherName: teacherName || settings.teacherName,
          signature: signature || undefined,
        };
      });

      const filteredLessons = lessonsPayload.filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== null);
      if (filteredLessons.length === 0) {
        throw new Error("لم يتم اختيار أي حصة للتصدير");
      }

      const firstDivision = filteredLessons[0];
      const payloadStudents = Array.from(unionStudents.values()).map((student) => ({
        id: student.id,
        name: student.name,
      }));

      const payload = {
        directorate: settings.directorate,
        school: settings.school,
        day,
        date,
        className: firstDivision?.className ?? "",
        division: firstDivision?.division ?? "",
        subject: firstDivision?.subject,
        teacherName: teacherName || settings.teacherName,
        signature: signature || undefined,
        students: payloadStudents,
        lessons: filteredLessons,
      };

      const response = await fetch("/api/export/lesson-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (!data?.id) {
        throw new Error("الاستجابة غير صالحة");
      }

      setDownloadInfo({ id: data.id, filename: data.filename });
      toast({
        title: "تم إنشاء الملف",
        description: data.filename ? `تم تجهيز الملف: ${data.filename}` : "يمكنك تنزيل سجل الحصص الآن",
      });
    } catch (error: any) {
      toast({
        title: "تعذر إنشاء الملف",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadInfo) {
      toast({
        title: "لا يوجد ملف",
        description: "يرجى إنشاء سجل الحصص أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      const response = await fetch(`/api/export/lesson-attendance?id=${encodeURIComponent(downloadInfo.id)}`);
      if (!response.ok) {
        throw new Error("فشل تحميل الملف");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadInfo.filename || "سجل_الحصة.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "تعذر تنزيل الملف",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-12 sm:px-6 lg:px-8" dir="rtl">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-b from-primary/10 via-muted/40 to-background px-5 py-7 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ClipboardList className="h-4 w-4" /> لوحة حضور الحصص
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">سجل الحصة الصفية</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              متابعة فورية لحضور الطلبة خلال اليوم الدراسي مع إمكانية فتح كل حصة وتعديل حضور الطلبة بسرعة، ثم تصدير سجل
              منسق للطباعة أو المشاركة.
            </p>
          </div>
          <div className="grid w-full gap-3 rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm sm:grid-cols-2 lg:max-w-lg">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">إدارة يومية مرنة</p>
                <p className="text-xs text-muted-foreground">
                  اختر اليوم والتاريخ، ثم افتح الحصة المطلوبة وحدث الحضور ببضع نقرات.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">تصدير جاهز للطباعة</p>
                <p className="text-xs text-muted-foreground">
                  أنشئ ملف Excel منسق يتضمن تفاصيل الصف والحصص والغيابات بنقرة واحدة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 bg-primary/10">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-primary">إجمالي الطلبة المتابعين</span>
            <span className="text-2xl font-bold text-foreground">
              {numberFormatter.format(totalStudentsTracked)}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-emerald-500/10">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">إجمالي الحضور</span>
            <span className="text-2xl font-bold text-foreground">
              {numberFormatter.format(totalStudentsTracked - totalAbsentStudents)}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-destructive/10">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-destructive">إجمالي الغياب</span>
            <span className="text-2xl font-bold text-foreground">
              {numberFormatter.format(totalAbsentStudents)}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/30">
          <CardContent className="flex flex-col gap-2 px-4 py-5">
            <span className="text-xs font-semibold text-muted-foreground">عدد الحصص النشطة</span>
            <span className="text-2xl font-bold text-foreground">
              {activeSummaries.length}
            </span>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2"
            variant="default"
            onClick={handleGenerate}
            disabled={isGenerating || divisionOptions.length === 0}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            إنشاء الملف
          </Button>
          <Button className="gap-2" variant="outline" onClick={handleDownload} disabled={!downloadInfo || isDownloading}>
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            تحميل
          </Button>
          <Button className="gap-2" variant="outline" onClick={resetAllLessons} disabled={divisionOptions.length === 0}>
            <RotateCcw className="h-4 w-4" />
            إعادة تعيين الحضور
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
          <Users className="h-4 w-4 text-primary" />
          يتم اعتبار الطالب حاضرًا افتراضيًا ما لم يتم إلغاء تحديده.
        </div>
      </section>

      {divisionOptions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>لا توجد بيانات صفوف</CardTitle>
            <CardDescription>
              يرجى رفع ملف الطلبة من صفحة التجهيزات أولاً ثم العودة لإعداد سجل الحصة الصفية.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">البيانات العامة</CardTitle>
              <CardDescription>حدد اليوم والتاريخ وبيانات المعلم لتضمينها في السجل النهائي.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="day">اليوم</Label>
                <Select value={day} onValueChange={(value) => setDay(value)}>
                  <SelectTrigger id="day">
                    <SelectValue placeholder="اختر اليوم" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">التاريخ</Label>
                <Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher-name">اسم المعلم</Label>
                <Input
                  id="teacher-name"
                  value={teacherName}
                  onChange={(event) => setTeacherName(event.target.value)}
                  placeholder="أدخل اسم المعلم"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">التوقيع</Label>
                <Input
                  id="signature"
                  value={signature}
                  onChange={(event) => setSignature(event.target.value)}
                  placeholder="أدخل التوقيع (اختياري)"
                />
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <p className="text-sm font-medium text-foreground">الحصص المراد تصديرها</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {lessonConfigs.map((lesson, index) => (
                    <label
                      key={index}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors",
                        lesson.active ? "border-primary/60 bg-primary/10" : "border-border/60 bg-muted/20",
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{lesson.name || `الحصة ${index + 1}`}</span>
                        <span className="text-xs text-muted-foreground">
                          {lesson.divisionId ? divisionMap.get(lesson.divisionId)?.label ?? "" : "لم يتم اختيار الشعبة بعد"}
                        </span>
                      </div>
                      <Checkbox
                        checked={lesson.active}
                        onCheckedChange={() => toggleLessonActive(index)}
                        aria-label={`تضمين ${lesson.name || `الحصة ${index + 1}`}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Accordion
            type="single"
            collapsible
            value={accordionValue}
            onValueChange={(value) => setAccordionValue(value || undefined)}
            className="space-y-4"
          >
            {lessonConfigs.map((lesson, index) => {
              const variant = LESSON_CARD_VARIANTS[index % LESSON_CARD_VARIANTS.length];
              const division = divisionMap.get(lesson.divisionId);
              const students = division?.students ?? [];
              const summary = lessonSummaries[index];

              return (
                <AccordionItem key={index} value={`lesson-${index + 1}`} className="border-none">
                  <Card
                    className={cn(
                      "transition-colors duration-200 overflow-hidden",
                      variant.card,
                      !lesson.active && "opacity-70",
                    )}
                  >
                    <AccordionTrigger className="px-6">
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <div className="text-right">
                          <p className={cn("text-lg font-semibold", variant.accent)}>{lesson.name || `الحصة ${index + 1}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {division?.label ?? "لم يتم اختيار الشعبة"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{summary.presentCount} حاضر</span>
                          <span>{summary.absentCount} غائب</span>
                          <Checkbox
                            checked={lesson.active}
                            onCheckedChange={(checked) => {
                              toggleLessonActive(index);
                              if (checked) {
                                setAccordionValue(`lesson-${index + 1}`);
                              }
                            }}
                            aria-label={`تضمين ${lesson.name || `الحصة ${index + 1}`}`}
                            className="ml-2"
                          />
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-name-${index}`}>اسم الحصة</Label>
                            <Input
                              id={`lesson-name-${index}`}
                              value={lesson.name}
                              onChange={(event) => handleNameChange(index, event.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`lesson-division-${index}`}>الصف والشعبة</Label>
                            <Select
                              value={lesson.divisionId}
                              onValueChange={(value) => handleDivisionChange(index, value)}
                            >
                              <SelectTrigger id={`lesson-division-${index}`}>
                                <SelectValue placeholder="اختر الشعبة" />
                              </SelectTrigger>
                              <SelectContent>
                                {divisionOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`lesson-subject-${index}`}>المادة</Label>
                            <Select
                              value={lesson.subjectId ?? ""}
                              onValueChange={(value) => handleSubjectChange(index, value)}
                            >
                              <SelectTrigger id={`lesson-subject-${index}`}>
                                <SelectValue placeholder="اختر المادة" />
                              </SelectTrigger>
                              <SelectContent>
                                {(division?.subjects ?? []).map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-foreground">ملخص الحصة</p>
                            <div
                              className={cn(
                                "mt-2 rounded-lg border border-border/60 p-3 text-sm space-y-1",
                                variant.summary,
                              )}
                            >
                              <div className="flex justify-between">
                                <span>الصف:</span>
                                <span className={cn("font-medium", variant.accent)}>{summary.classLabel}</span>
                              </div>
                              {summary.subjectName ? (
                                <div className="flex justify-between">
                                  <span>المادة:</span>
                                  <span className={cn("font-medium", variant.accent)}>{summary.subjectName}</span>
                                </div>
                              ) : null}
                              <div className="flex justify-between">
                                <span>الحضور:</span>
                                <span className="font-semibold text-chart-1">{summary.presentCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>الغياب:</span>
                                <span className="font-semibold text-destructive">{summary.absentCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => markLessonStudents(index, true)}>
                              تحديد الجميع حاضر
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => markLessonStudents(index, false)}>
                              تحديد الجميع غائب
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            يتم اعتبار الطلاب غير المحددين كحاضرين بشكل افتراضي.
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-full table-fixed border-collapse text-sm sm:min-w-[560px]">
                            <thead>
                              <tr className={cn("text-sm font-medium", variant.tableHead)}>
                                <th className="sticky right-0 px-3 py-2 text-right">الطالب</th>
                                <th className="px-3 py-2">الحضور</th>
                              </tr>
                            </thead>
                            <tbody>
                              {students.length === 0 ? (
                                <tr>
                                  <td colSpan={2} className="px-3 py-4 text-muted-foreground text-sm">
                                    لا يوجد طلبة مرتبطون بهذه الشعبة.
                                  </td>
                                </tr>
                              ) : (
                                students.map((student, studentIndex) => {
                                  const zebra = studentIndex % 2 === 0 ? "bg-background" : "bg-muted/40";
                                  const present = lesson.presentById?.[student.id] ?? true;
                                  return (
                                    <tr key={student.id} className={zebra}>
                                      <td className="sticky right-0 bg-background/80 px-3 py-2 text-right font-medium">
                                        {student.name}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Checkbox
                                          checked={present}
                                          onCheckedChange={() => toggleStudentPresence(index, student.id)}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div
                          className={cn(
                            "rounded-lg border border-dashed border-border/60 p-3 text-xs leading-relaxed",
                            summary.absentNames.length > 0
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {summary.absentNames.length > 0
                            ? `الطلاب الغائبون: ${summary.absentNames.join("، ")}`
                            : "لا يوجد غياب في هذه الحصة."}
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              );
            })}
          </Accordion>
        </>
      )}
    </div>
  );
}
