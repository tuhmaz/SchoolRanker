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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { ClassSubjectManager } from "@/components/ClassSubjectManager";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Save, RefreshCcw, Printer, UploadCloud, Layers, Sparkles, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseUnifiedReport, type ParsedData } from "@/lib/excelParser";

const STORAGE_KEY = "unifiedSetupSettings";
const LEGACY_STORAGE_KEY = "appSettings";

export default function UnifiedSettings() {
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setTeacherName(saved.teacherName ?? "");
      setDirectorate(saved.directorate ?? saved.schoolInfo?.directorate ?? "");
      setSchool(saved.school ?? saved.schoolInfo?.school ?? "");
      setTown(saved.town ?? "");
      setIsHomeroom(!!saved.isHomeroom);
      setHomeroomClass(saved.homeroomClass ?? "");
      setClasses(Array.isArray(saved.classes) ? saved.classes : []);
      setWarnings(Array.isArray(saved.warnings) ? saved.warnings : []);
      const students = Array.isArray(saved.students) ? saved.students : [];
      setParsedData({ students, classes: Array.isArray(saved.classes) ? saved.classes : [], schoolInfo: saved.schoolInfo });
    } catch {
      // ignore invalid storage
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const data = await parseUnifiedReport(selectedFile);
      setParsedData(data);
      setClasses(data.classes);
      setWarnings(data.warnings ?? []);

      toast({
        title: "تم التحميل بنجاح",
        description: `تم استخلاص ${data.students.length} طالب/ة من ${data.classes.length} صف حديث`,
        variant: "success",
      });

      if (data.warnings?.length) {
        toast({
          title: "ملاحظات على النموذج",
          description: data.warnings.join("\n"),
          variant: "warning",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في قراءة النموذج",
        description: error.message || "تعذر معالجة نموذج EL_StudentInfoReport",
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
      students: parsedData?.students ?? [],
      warnings,
      schoolInfo: parsedData?.schoolInfo,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(settings));
    toast({
      title: "تم حفظ التجهيزات",
      description: "تم حفظ الإعدادات الخاصة بالنموذج الحديث",
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    toast({
      title: "تم المسح",
      description: "تم حذف جميع التجهيزات الخاصة بالنموذج الحديث",
      variant: "warning",
    });
  };

  const handlePrintCover = () => {
    toast({
      title: "جاري التحضير",
      description: "سيتم فتح نافذة الطباعة بناءً على المعلومات المحدثة",
      variant: "info",
    });
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
      {isProcessing && <LoadingOverlay message="جاري تحليل النموذج الحديث..." />}

      <section className="rounded-3xl border border-border/60 bg-gradient-to-b from-primary/10 via-muted/40 to-background px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" /> التجهيزات الحديثة
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">التجهيزات الخاصة بنموذج EL_StudentInfoReport</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              استخدم هذه الصفحة لمعالجة الملفات الحديثة الصادرة عن منصة أجيال (EL_StudentInfoReport). يتم اكتشاف الصفوف والشعب
              تلقائياً من كل ورقة عمل، مع الاحتفاظ بجميع التحذيرات لضمان بيانات دقيقة قبل إنشاء الدفاتر.
            </p>
          </div>
          <div className="grid w-full gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <UploadCloud className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">يدعم قراءة أوراق متعددة داخل الملف الواحد لاستخراج جميع الشعب.</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">يتأكد من وجود عمود الرقم الوطني قبل قبول البيانات.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/70 shadow-sm bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadCloud className="h-5 w-5 text-primary" /> رفع نموذج EL_StudentInfoReport
            </CardTitle>
            <CardDescription>قم برفع ملف XLS / XLSX الذي يحتوي على أوراق كشف الطلبة الحديثة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone
              onFileSelect={handleFileSelect}
              selectedFile={file}
              onClearFile={() => {
                setFile(null);
                setClasses([]);
                setParsedData(null);
                setWarnings([]);
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
                    {warnings.length > 0 && (
                      <div className="mt-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100">
                        <div className="font-semibold">تحذيرات مرتبطة بالاستخلاص</div>
                        <ul className="list-disc pr-6 text-sm leading-relaxed">
                          {warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {!parsedData && warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100">
                    <div className="font-semibold">تحذيرات</div>
                    <ul className="list-disc pr-6 text-sm leading-relaxed">
                      {warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
              <p className="font-medium">نصائح سريعة</p>
              <ul className="list-disc pr-4 leading-relaxed">
                <li>تأكد من أن الملف يحتوي على جميع أوراق الصفوف المطلوبة.</li>
                <li>لا تقم بتعديل أسماء الأعمدة داخل النموذج قبل الرفع.</li>
                <li>إذا تعددت الملفات، ارفع كل ملف على حدة ثم احفظ التجهيزات.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Layers className="h-5 w-5 text-primary" /> معلومات المعلم والمؤسسة
            </CardTitle>
            <CardDescription>ستُستخدم هذه البيانات في جميع التقارير والدفاتر الصادرة من الصفحة الحديثة.</CardDescription>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directorate">المديرية</Label>
                <Input
                  id="directorate"
                  value={directorate}
                  onChange={(e) => setDirectorate(e.target.value)}
                  placeholder="اسم المديرية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">المدرسة</Label>
                <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="اسم المدرسة" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="town">البلدة</Label>
                <Input id="town" value={town} onChange={(e) => setTown(e.target.value)} placeholder="اسم البلدة" />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="homeroom-switch" className="text-base font-semibold text-foreground">
                  هل أنت مربي صف؟
                </Label>
                <p className="text-xs text-muted-foreground">اختر الصف والشعبة الرئيسية التي ستنعكس في الغلاف.</p>
              </div>
              <Switch id="homeroom-switch" checked={isHomeroom} onCheckedChange={setIsHomeroom} />
            </div>

            {isHomeroom && availableClasses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="homeroom-class">اختر صفك</Label>
                <Select value={homeroomClass} onValueChange={setHomeroomClass}>
                  <SelectTrigger id="homeroom-class">
                    <SelectValue placeholder="اختر صفك" />
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
          <CardTitle className="text-xl">الصفوف المكتشفة</CardTitle>
          <CardDescription>
            {classes.length === 0
              ? "سيتم عرض الصفوف والشعب تلقائياً بعد رفع نموذج EL_StudentInfoReport"
              : "انقر على كل صف لإدارة المواد المخصصة له"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-100">
            نصيحة: احتفظ بأسماء المواد موحّدة لتسهيل دمجها مع الصفحات الأخرى مثل الدفاتر الرئيسة.
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
            <Button variant="outline">
              <RefreshCcw className="w-4 h-4 ml-2" />
              إعادة تعيين
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-[440px]" dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد إعادة التعيين</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف جميع التجهيزات المحفوظة لهذا النموذج. هل ترغب بالمتابعة؟</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-start">
              <AlertDialogCancel>تراجع</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetConfirmed} className="bg-amber-600 hover:bg-amber-700">
                مسح التجهيزات
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="secondary" onClick={handlePrintCover} disabled={!teacherName || !school}>
          <Printer className="w-4 h-4 ml-2" />
          طباعة الغلاف
        </Button>
      </div>
    </div>
  );
}
