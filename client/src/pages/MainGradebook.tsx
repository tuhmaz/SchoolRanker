import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, CalendarCheck, ClipboardList, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { AdSlot } from "@/components/ads/AdSlot";
import { AD_SLOTS } from "@/config/ads";

interface StoredSettings {
  teacherName?: string;
  directorate?: string;
  school?: string;
  town?: string;
  program?: string;
  year?: string;
  isHomeroom?: boolean;
  homeroomClass?: string;
  classes?: any[];
  students?: any[];
}

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9",
};

const normalizeArabicDigits = (value: string): string => value.replace(/[\u0660-\u0669]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit);

const normalizeClassName = (className: string | undefined): string => {
  if (!className) return "";
  return className
    .toLowerCase()
    .replace(/[\u0660-\u0669]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit)
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^a-z0-9\u0600-\u06FF\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const GRADE_KEYWORDS: Array<{ grade: number; keywords: string[] }> = [
  { grade: 12, keywords: ["ثاني ثانوي", "الثاني ثانوي", "ثاني عشر", "الثاني عشر", "الصف الثاني عشر", "صف ثاني ثانوي", "12"] },
  { grade: 11, keywords: ["اول ثانوي", "الاول ثانوي", "حادي عشر", "الحادي عشر", "الصف الحادي عشر", "صف اول ثانوي", "11"] },
  { grade: 10, keywords: ["العاشر", "عاشر", "الصف العاشر", "صف عاشر", "10"] },
  { grade: 9, keywords: ["التاسع", "تاسع", "الصف التاسع", "صف تاسع", "9"] },
  { grade: 8, keywords: ["الثامن", "ثامن", "الصف الثامن", "صف ثامن", "8"] },
  { grade: 7, keywords: ["السابع", "سابع", "الصف السابع", "صف سابع", "7"] },
  { grade: 6, keywords: ["السادس", "سادس", "الصف السادس", "صف سادس", "6"] },
  { grade: 5, keywords: ["الخامس", "خامس", "الصف الخامس", "صف خامس", "5"] },
  { grade: 4, keywords: ["الرابع", "رابع", "الصف الرابع", "صف رابع", "4"] },
  { grade: 3, keywords: ["الثالث", "ثالث", "الصف الثالث", "صف ثالث", "3"] },
  { grade: 2, keywords: ["الثاني", "ثاني", "الصف الثاني", "صف ثاني", "2"] },
  { grade: 1, keywords: ["الاول", "اول", "الصف الاول", "صف اول", "1"] },
  { grade: 0, keywords: ["روضة", "رياض الاطفال", "الروضة", "صف روضة", "kg2", "kg 2", "kg", "kg1", "0"] },
];

const extractGradeLevel = (className?: string): number | null => {
  if (!className) return null;
  const normalized = normalizeClassName(className);
  if (!normalized) return null;

  for (const { grade, keywords } of GRADE_KEYWORDS) {
    const sortedKeywords = keywords.slice().sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
      if (normalized.includes(keyword)) {
        return grade;
      }
    }
  }

  const digitMatch = normalized.match(/\b(1[0-2]|[0-9])\b/);
  if (digitMatch) {
    const parsed = Number.parseInt(digitMatch[1], 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const LOWER_LEVEL_KEYWORDS = ["روضه", "روضة", "رياض الاطفال", "رياضالاطفال", "kg", "كيجي", "تمهيدي"];
const LOWER_ELEMENTARY_KEYWORDS = ["الاول", "اول", "الثاني", "ثاني", "الثالث", "ثالث"];

const isLowerLevelClassName = (className?: string): boolean => {
  if (!className) return false;
  const normalized = normalizeClassName(className).replace(/\s+/g, "");
  if (!normalized) return false;

  if (LOWER_LEVEL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  if (LOWER_ELEMENTARY_KEYWORDS.some((keyword) => normalized.includes(keyword) && !normalized.includes("ثانوي"))) {
    return true;
  }

  const digitMatch = normalized.match(/\b(0|1|2|3)\b/);
  if (digitMatch && !normalized.includes("ثانوي")) {
    return true;
  }

  return false;
};

const filterClassesByPreference = (classes: any[], preference?: "lower" | "upper") => {
  if (!Array.isArray(classes)) return [];
  if (preference === "lower") {
    return classes.filter((group) => {
      const grade = extractGradeLevel(group?.className);
      if (grade == null) return isLowerLevelClassName(group?.className);
      return grade <= 3;
    });
  }
  if (preference === "upper") {
    return classes.filter((group) => {
      const grade = extractGradeLevel(group?.className);
      if (grade == null) {
        return !isLowerLevelClassName(group?.className);
      }
      return grade >= 4;
    });
  }
  return classes.slice();
};

const filterStudentsByPreference = (classes: any[], students: any[], preference?: "lower" | "upper") => {
  if (!Array.isArray(students)) return [];
  const classNameLookup = new Map<string, string>();
  classes.forEach((group) => {
    const normalized = normalizeClassName(group?.className);
    if (normalized) classNameLookup.set(normalized, group?.className);
  });
  const allowed = new Set(classNameLookup.keys());

  return students.filter((student) => {
    const studentClass = student?.class || "";
    const normalizedStudentClass = normalizeClassName(studentClass);
    const grade = extractGradeLevel(studentClass);

    if (preference === "lower") {
      if (grade != null && grade >= 4) return false;
      if (grade == null && !isLowerLevelClassName(studentClass)) return false;
      return allowed.has(normalizedStudentClass);
    }

    if (preference === "upper") {
      if (grade == null) {
        if (isLowerLevelClassName(studentClass)) return false;
        return allowed.has(normalizedStudentClass);
      }
      if (grade < 4) return false;
      return allowed.has(normalizedStudentClass);
    }

    if (allowed.size === 0) return true;
    return allowed.has(normalizedStudentClass);
  });
};

export default function MainGradebook() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);
  const [showGenerateOverlay, setShowGenerateOverlay] = useState(false);
  const [generateCountdown, setGenerateCountdown] = useState(0);

  useEffect(() => {
    if (!showGenerateOverlay) return;
    const interval = window.setInterval(() => {
      setGenerateCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [showGenerateOverlay]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("appSettings");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setSettings(parsed);
    } catch (_) {
      toast({
        title: "تعذر تحميل البيانات",
        description: "لم نتمكن من قراءة التجهيزات المحفوظة",
        variant: "destructive",
      });
    }
  }, [toast]);

  const hasPreparedData = useMemo(() => {
    const classes = settings?.classes;
    const students = settings?.students;
    return Array.isArray(classes) && classes.length > 0 && Array.isArray(students) && students.length > 0;
  }, [settings]);

  const totalStudents = useMemo(() => settings?.students?.length ?? 0, [settings]);
  const totalClasses = useMemo(() => settings?.classes?.length ?? 0, [settings]);

  const handleGenerate = async (templatePreference?: "lower" | "upper") => {
    if (!hasPreparedData) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تجهيز الصفوف والطلبة من صفحة التجهيزات أولاً",
        variant: "destructive",
      });
      return;
    }

    const filteredClasses = filterClassesByPreference(settings?.classes ?? [], templatePreference);
    const filteredStudents = filterStudentsByPreference(filteredClasses, settings?.students ?? [], templatePreference);

    if (templatePreference && filteredClasses.length === 0) {
      toast({
        title: "لا توجد صفوف",
        description: "لا توجد صفوف مناسبة للخيار المحدد. يرجى مراجعة الإعدادات أو اختيار خيار آخر",
        variant: "destructive",
      });
      return;
    }

    if (templatePreference && filteredStudents.length === 0) {
      toast({
        title: "لا توجد بيانات طلبة",
        description: "لا توجد بيانات طلبة مناسبة للخيار المحدد. يرجى التأكد من تجهيز الصفوف المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const WAIT_SECONDS = 15;

      setIsGenerating(true);
      setDownloadInfo(null);
      setGenerateCountdown(WAIT_SECONDS);
      setShowGenerateOverlay(true);
      const modeLabel = templatePreference === "lower" ? "(روضة - ثالث)" : templatePreference === "upper" ? "(رابع - ثاني ثانوي)" : "";
      toast({
        title: "جاري المعالجة",
        description: modeLabel ? `سيتم إنشاء دفتر العلامات الرئيسي ${modeLabel}` : "سيتم إنشاء دفتر العلامات الرئيسي الآن",
      });

      let exportError: Error | null = null;

      const minDelay = new Promise((resolve) => {
        window.setTimeout(resolve, WAIT_SECONDS * 1000);
      });

      const exportTask = (async () => {
        try {
          const response = await fetch("/api/export/main-gradebook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teacherName: settings?.teacherName,
              directorate: settings?.directorate,
              school: settings?.school,
              town: settings?.town,
              program: settings?.program,
              year: settings?.year,
              isHomeroom: settings?.isHomeroom,
              homeroomClass: settings?.homeroomClass,
              templatePreference,
              classes: settings?.classes ?? [],
              students: settings?.students ?? [],
            }),
          });

          if (!response.ok) {
            const message = await response.text();
            throw new Error(message || "تعذر إنشاء دفتر العلامات الرئيسي");
          }

          const data = await response.json();
          if (!data?.id) {
            throw new Error("الاستجابة غير صالحة");
          }

          setDownloadInfo({ id: data.id, filename: data.filename });
          toast({
            title: "اكتمل الإنشاء",
            description: data.filename ? `تم تجهيز الملف: ${data.filename}` : "يمكنك تنزيل الدفتر الآن",
          });
        } catch (error: any) {
          exportError = error instanceof Error ? error : new Error("تعذر إنشاء دفتر العلامات الرئيسي");
        }
      })();

      await Promise.all([exportTask, minDelay]);

      if (exportError) {
        throw exportError;
      }
    } catch (error: any) {
      toast({
        title: "تعذر إنشاء الدفتر",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setShowGenerateOverlay(false);
      setGenerateCountdown(0);
    }
  };

  const handleDownloadExcel = async () => {
    if (!downloadInfo) {
      toast({
        title: "لا يوجد ملف",
        description: "يرجى إنشاء الدفتر أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      const response = await fetch(`/api/export/main-gradebook?id=${encodeURIComponent(downloadInfo.id)}`);
      if (!response.ok) {
        throw new Error("فشل تحميل الملف");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadInfo.filename || "دفتر_العلامات_الرئيسي.xlsx";
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
      {showGenerateOverlay && (
        <LoadingOverlay
          message={`جاري إنشاء دفتر العلامات الرئيسي... يرجى الانتظار ${generateCountdown > 0 ? `${generateCountdown} ثانية` : "قليلًا"}`}
        >
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">بدعم من شركائنا الإعلانيين</p>
            <AdSlot
              slot={AD_SLOTS.contentInline}
              className="border-none bg-transparent p-0"
              showLabel={false}
              insStyle={{ display: "block", minHeight: "120px" }}
            />
          </div>
        </LoadingOverlay>
      )}

      <section className="rounded-3xl border border-border/70 bg-muted/30 px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <ClipboardList className="h-4 w-4" /> دفتر العلامات الرئيسي
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">إصدار دفتر العلامات الرئيسي</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              تأكد من اعتماد البيانات في صفحة التجهيزات، ثم أنشئ ملف Excel متوافق مع القوالب الرسمية، جاهز للطباعة المباشرة مع هوامش محسوبة.
            </p>
          </div>
          <div className="grid w-full gap-3 rounded-2xl border border-border/60 bg-background p-4 text-sm sm:grid-cols-2 lg:max-w-lg">
            <div className="flex items-start gap-3">
              <CalendarCheck className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">إعداد فصول السنة</p>
                <p className="text-xs text-muted-foreground">اختر القالب المناسب وفق المرحلة الدراسية لتوزيع الصفوف تلقائيًا.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">جاهزية رسمية</p>
                <p className="text-xs text-muted-foreground">الملفات الناتجة متوافقة مع متطلبات الطباعة والتدقيق داخل المدرسة.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/70 bg-background/95">
          <CardContent className="flex flex-col gap-1 px-4 py-5">
            <span className="text-xs font-semibold text-muted-foreground">عدد الصفوف</span>
            <span className="text-2xl font-bold text-foreground break-words">{totalClasses}</span>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-background/95">
          <CardContent className="flex flex-col gap-1 px-4 py-5">
            <span className="text-xs font-semibold text-muted-foreground">عدد الطلبة</span>
            <span className="text-2xl font-bold text-foreground break-words">{totalStudents}</span>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-background/95">
          <CardContent className="flex flex-col gap-1 px-4 py-5">
            <span className="text-xs font-semibold text-muted-foreground">اسم المدرسة</span>
            <span className="text-xl font-semibold text-foreground break-words leading-tight">{settings?.school || "—"}</span>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-background/95">
          <CardContent className="flex flex-col gap-1 px-4 py-5">
            <span className="text-xs font-semibold text-muted-foreground">اسم المعلم</span>
            <span className="text-xl font-semibold text-foreground break-words leading-tight">{settings?.teacherName || "—"}</span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> إنشاء الملف
            </CardTitle>
            <CardDescription>اختر القالب الملائم لكل مرحلة أو استخدم التوزيع التلقائي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-background px-4 py-4 text-sm text-muted-foreground">
              عند اختيار أي قالب، يتم تجهيز ملف Excel يتضمن الصفوف، الشعب، والمواد المعتمدة، مع توزيع الطلاب آليًا حسب بياناتك.
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                onClick={() => handleGenerate("lower")}
                disabled={isGenerating || !hasPreparedData}
                data-testid="button-generate-main-gradebook-lower"
                className="h-12 w-full justify-center gap-2 whitespace-nowrap"
              >
                {isGenerating ? "جاري الإنشاء..." : "صفوف الأولى"}
              </Button>
              <Button
                onClick={() => handleGenerate("upper")}
                disabled={isGenerating || !hasPreparedData}
                data-testid="button-generate-main-gradebook-upper"
                className="h-12 w-full justify-center gap-2 whitespace-nowrap"
              >
                {isGenerating ? "جاري الإنشاء..." : "رابع - ثاني ثانوي"}
              </Button>
              <Button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !hasPreparedData}
                variant="outline"
                className="h-12 w-full justify-center gap-2 whitespace-nowrap"
              >
               جميع المراحل
              </Button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <span className="font-medium">تنبيه:</span> تأكد من أن كل صف مرتبط بشعبة واحدة على الأقل لضمان ظهور جميع الطلبة في الدفتر.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={handleDownloadExcel}
                disabled={!downloadInfo || isDownloading}
                data-testid="button-download-main-gradebook"
                className="h-12 gap-2"
              >
                {isDownloading ? "جاري التنزيل..." : (<><Download className="h-4 w-4" />تنزيل الملف النهائي</>)}
              </Button>
              <Button
                onClick={() => window.open("/templates", "_blank")}
                variant="secondary"
                className="h-12 gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                الاطلاع على القوالب
              </Button>
            </div>

            {!hasPreparedData && (
              <p className="text-sm text-muted-foreground">
                لم يتم العثور على بيانات الصفوف أو الطلبة. يرجى رفع ملف الطلبة من صفحة التجهيزات أولاً.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">ملخص التجهيزات المحفوظة</CardTitle>
            <CardDescription>عرض سريع للبيانات الأساسية قبل إنشاء الدفتر.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-border/60 bg-background px-4 py-3">
                <span className="text-xs text-muted-foreground">المديرية</span>
                <p className="text-base font-semibold text-foreground break-words leading-tight">{settings?.directorate || "—"}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-border/60 bg-background px-4 py-3">
                <span className="text-xs text-muted-foreground">البرنامج</span>
                <p className="text-base font-semibold text-foreground break-words leading-tight">{settings?.program || "—"}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-border/60 bg-background px-4 py-3">
                <span className="text-xs text-muted-foreground">العام الدراسي</span>
                <p className="text-base font-semibold text-foreground break-words leading-tight">{settings?.year || "—"}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-border/60 bg-background px-4 py-3">
                <span className="text-xs text-muted-foreground">مربي الصف</span>
                <p className="text-base font-semibold text-foreground break-words leading-tight">{settings?.isHomeroom ? settings.homeroomClass || "—" : "غير محدد"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-xs text-primary">
              <strong className="text-sm">ملاحظة:</strong> يمكنك إعادة إنشاء الملف في أي وقت بعد تحديث الطلبة أو المواد، وسيبقى آخر إصدار جاهزًا للتنزيل.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
