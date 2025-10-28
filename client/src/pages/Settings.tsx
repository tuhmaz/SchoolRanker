import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { ClassSubjectManager } from "@/components/ClassSubjectManager";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Save, RefreshCcw, Printer, ArrowUp, Sparkles, UploadCloud, Layers, Book } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, type ParsedData } from "@/lib/excelParser";

export default function Settings() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [directorate, setDirectorate] = useState("");
  const [school, setSchool] = useState("");
  const [town, setTown] = useState("");
  const [isHomeroom, setIsHomeroom] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('appSettings');
      if (!raw) return;
      const saved = JSON.parse(raw);
      setTeacherName(saved.teacherName ?? "");
      setDirectorate(saved.directorate ?? "");
      setSchool(saved.school ?? "");
      setTown(saved.town ?? "");
      setIsHomeroom(!!saved.isHomeroom);
      setHomeroomClass(saved.homeroomClass ?? "");
      const savedWarnings = Array.isArray(saved.warnings) ? saved.warnings : [];
      setClasses(Array.isArray(saved.classes) ? saved.classes : []);
      setWarnings(savedWarnings);
      // Rebuild minimal parsedData for UI summaries/components that depend on it
      const students = Array.isArray(saved.students) ? saved.students : [];
      setParsedData({ students, classes: Array.isArray(saved.classes) ? saved.classes : [] });
    } catch (_) {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await parseExcelFile(selectedFile);
      setParsedData(data);
      setClasses(data.classes);
      setWarnings(data.warnings ?? []);

      toast({
        title: "تم التحميل بنجاح",
        description: `تم استخلاص ${data.students.length} طالب/ة من ${data.classes.length} صف`,
        variant: "success",
      });

      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "تحذيرات في الملف",
          description: data.warnings.join("\n"),
          variant: "warning",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في معالجة الملف",
        description: error.message || "حدث خطأ أثناء قراءة الملف",
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadError = (message: string) => {
    toast({
      title: "تعذر رفع الملف",
      description: message,
      variant: "destructive",
    });
  };

  const handleSave = () => {
    const settings = {
      teacherName,
      directorate,
      school,
      town,
      isHomeroom,
      homeroomClass,
      classes,
      students: parsedData?.students || [],
      warnings
    };

    localStorage.setItem('appSettings', JSON.stringify(settings));

    toast({
      title: "تم الحفظ بنجاح",
      description: "تم حفظ جميع التجهيزات",
      variant: "success",
    });
  };

  const handleResetConfirmed = () => {
    setFile(null);
    setTeacherName("");
    setDirectorate("");
    setSchool("");
    setTown("");
    setIsHomeroom(false);
    setHomeroomClass("");
    setClasses([]);
    setParsedData(null);
    setWarnings([]);
    localStorage.removeItem('appSettings');

    toast({
      title: "تم المسح",
      description: "تم مسح جميع التجهيزات",
      variant: "warning",
    });
  };

  const handlePrintCover = () => {
    toast({
      title: "جاري الطباعة",
      description: "سيتم فتح نافذة الطباعة",
      variant: "info",
    });
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const availableClasses = useMemo(
    () =>
      classes.flatMap((classGroup) =>
        classGroup.divisions.map((div: any) => ({
          id: div.id,
          label: `${classGroup.className} - ${div.division}`,
        })),
      ),
    [classes],
  );

  return (
    <div className="space-y-8" dir="rtl">
      {isProcessing && <LoadingOverlay message="جاري معالجة الملف..." />}

      <section className="rounded-3xl border border-border/60 bg-gradient-to-b from-primary/10 via-muted/40 to-background px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" /> منطقة التجهيز المركزي
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">التجهيزات الأساسية</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              جهّز بيانات المدرسة، واضبط الصفوف والشعب والمواد قبل إنشاء الدفاتر. كل خطوة هنا تساعدك في الحصول على ملفات
              جاهزة للطباعة دون الحاجة لتعديلات يدوية لاحقًا.
            </p>
          </div>
          <div className="grid w-full gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <UploadCloud className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">ارفع ملف منصة أجيال وسيتم بناء الصفوف والشعب تلقائيًا.</span>
            </div>
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">كل صف يحتوي على لوحة مواد قابلة للطي لتسهيل الإضافة السريعة.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/70 shadow-sm bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadCloud className="h-5 w-5 text-primary" /> رفع ملف الطلبة
            </CardTitle>
            <CardDescription>قم برفع كشف الطلبة من منصة أجيال (Excel)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone
              onFileSelect={handleFileSelect}
              selectedFile={file}
              onClearFile={() => {
                setFile(null);
                setClasses([]);
                setParsedData(null);
              }}
              disabled={isProcessing}
              onError={handleUploadError}
            />
            {(parsedData || warnings.length > 0) && (
              <div className="space-y-3">
                {parsedData && (
                  <div className="rounded-xl border border-chart-1/30 bg-chart-1/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-chart-1">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-medium">
                        تم استخلاص {parsedData.students.length} طالب/ة من {parsedData.classes.length} صف
                      </span>
                    </div>
                  </div>
                )}
                {warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100">
                    <div className="font-semibold">تحذيرات في الملف</div>
                    <ul className="list-disc pr-6 text-sm leading-relaxed">
                      {warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Book className="h-5 w-5 text-primary" /> معلومات المعلم والمدرسة
            </CardTitle>
            <CardDescription>تأكد من كتابة الأسماء الرسمية كما ستظهر في التقارير.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teacher-name">اسم المعلم</Label>
                <Input
                  id="teacher-name"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="أدخل اسم المعلم"
                  data-testid="input-teacher-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directorate">المديرية</Label>
                <Input
                  id="directorate"
                  value={directorate}
                  onChange={(e) => setDirectorate(e.target.value)}
                  placeholder="أدخل اسم المديرية"
                  data-testid="input-directorate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">المدرسة</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="أدخل اسم المدرسة"
                  data-testid="input-school"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="town">البلدة</Label>
                <Input
                  id="town"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="أدخل اسم البلدة"
                  data-testid="input-town"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="homeroom-switch" className="text-base font-semibold text-foreground">
                  هل أنت مربي صف؟
                </Label>
                <p className="text-xs text-muted-foreground">
                  سيؤدي تفعيل هذا الخيار إلى ربط التقارير بالصف الذي تشرف عليه بشكل مباشر.
                </p>
              </div>
              <Switch
                id="homeroom-switch"
                checked={isHomeroom}
                onCheckedChange={setIsHomeroom}
                data-testid="switch-homeroom"
              />
            </div>

            {isHomeroom && availableClasses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="homeroom-class">اختر صفك</Label>
                <Select value={homeroomClass} onValueChange={setHomeroomClass}>
                  <SelectTrigger id="homeroom-class" data-testid="select-homeroom-class">
                    <SelectValue placeholder="اختر صفك..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">الصفوف والمواد</CardTitle>
          <CardDescription>
            {classes.length === 0 ? "سيتم عرض الصفوف بعد رفع ملف الطلبة" : "انقر على الصف لفتح لوحة المواد الخاصة به"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-100">
            نصيحة: أضف المواد بصيغة موحّدة (مثل "اللغة العربية"، "الرياضيات") لتظهر بالشكل المطلوب في التقارير والدفاتر.
          </div>
          <ClassSubjectManager classes={classes} onUpdate={setClasses} students={parsedData?.students || []} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          حفظ التجهيزات
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid="button-reset">
              <RefreshCcw className="w-4 h-4 ml-2" />
              إعادة تعيين
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-[440px]" dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد إعادة التعيين</AlertDialogTitle>
              <AlertDialogDescription>
                ستؤدي هذه الخطوة إلى حذف جميع التجهيزات الحالية، بما في ذلك بيانات الصفوف والطلاب المحفوظة. هل ترغب
                بالمتابعة؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-start">
              <AlertDialogCancel>تراجع</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetConfirmed} className="bg-amber-600 hover:bg-amber-700">
                مسح التجهيزات
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="secondary"
          onClick={handlePrintCover}
          disabled={!teacherName || !school}
          data-testid="button-print-cover"
        >
          <Printer className="w-4 h-4 ml-2" />
          طباعة الغلاف
        </Button>
      </div>

      {showScrollTop && (
        <Button
          type="button"
          onClick={handleScrollToTop}
          className="fixed bottom-6 left-6 h-12 w-12 rounded-full shadow-lg"
          size="icon"
          aria-label="العودة إلى الأعلى"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
