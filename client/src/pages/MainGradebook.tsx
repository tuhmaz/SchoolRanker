import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, CalendarCheck, ClipboardList, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function MainGradebook() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);

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

    try {
      setIsGenerating(true);
      setDownloadInfo(null);
      const modeLabel = templatePreference === "lower" ? "(روضة - ثالث)" : templatePreference === "upper" ? "(رابع - ثاني ثانوي)" : "";
      toast({
        title: "جاري المعالجة",
        description: modeLabel ? `سيتم إنشاء دفتر العلامات الرئيسي ${modeLabel}` : "سيتم إنشاء دفتر العلامات الرئيسي الآن",
      });

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
        throw new Error(await response.text());
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
      toast({
        title: "تعذر إنشاء الدفتر",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
