import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download } from "lucide-react";
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

  const handleGenerate = async () => {
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
      toast({
        title: "جاري المعالجة",
        description: "سيتم إنشاء دفتر العلامات الرئيسي الآن",
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
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إنشاء دفتر علامات رئيسي</h1>
        <p className="text-muted-foreground mt-2">
          تأكد من أن جميع البيانات في صفحة "التجهيزات" صحيحة ومحفوظة قبل المتابعة. يستخدم القالب الأصلي
          الموجود في المسار `templates/alem_a.xlsx`.
        </p>
      </div>

      <Card className="border-r-4 border-r-chart-3">
        <CardHeader>
          <CardTitle>مراجعة التجهيزات</CardTitle>
          <CardDescription>يتم الاعتماد على المعلومات المحفوظة في صفحة التجهيزات.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="p-4 rounded-md border border-border/60 bg-muted/30">
            <div className="text-muted-foreground">عدد الصفوف</div>
            <div className="text-lg font-semibold">{totalClasses}</div>
          </div>
          <div className="p-4 rounded-md border border-border/60 bg-muted/30">
            <div className="text-muted-foreground">عدد الطلبة</div>
            <div className="text-lg font-semibold">{totalStudents}</div>
          </div>
          <div className="p-4 rounded-md border border-border/60 bg-muted/30">
            <div className="text-muted-foreground">اسم المدرسة</div>
            <div className="text-lg font-semibold">{settings?.school || "—"}</div>
          </div>
          <div className="p-4 rounded-md border border-border/60 bg-muted/30">
            <div className="text-muted-foreground">اسم المعلم</div>
            <div className="text-lg font-semibold">{settings?.teacherName || "—"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>دفتر العلامات الرئيسي</CardTitle>
          <CardDescription>يتم إنشاء الملف باستخدام القالب الرسمي `templates/alem_a.xlsx` مع جميع المواد والشعب.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-6 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">دفتر كامل بجميع الطلبة والصفوف وفق التنسيق الأصلي.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} disabled={isGenerating || !hasPreparedData} data-testid="button-generate-main-gradebook">
              <FileSpreadsheet className="w-4 h-4 ml-2" />
              معالجة وإنشاء الدفتر
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadExcel}
              disabled={!downloadInfo || isDownloading}
              data-testid="button-download-main-excel"
            >
              <Download className="w-4 h-4 ml-2" />
              تحميل Excel
            </Button>
          </div>

          {!hasPreparedData && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              يرجى حفظ التجهيزات (الصفوف والطلبة) من صفحة "التجهيزات" قبل إنشاء دفتر العلامات الرئيسي.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
