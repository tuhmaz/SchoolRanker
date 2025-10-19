import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { ClassSubjectManager } from "@/components/ClassSubjectManager";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Save, RefreshCcw, Printer, ArrowUp } from "lucide-react";
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
      });

      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "تحذيرات في الملف",
          description: data.warnings.join("\n"),
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
    });
  };

  const handleReset = () => {
    if (confirm("هل أنت متأكد من مسح جميع التجهيزات؟")) {
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
      });
    }
  };

  const handlePrintCover = () => {
    toast({
      title: "جاري الطباعة",
      description: "سيتم فتح نافذة الطباعة",
    });
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const availableClasses = classes.flatMap(classGroup =>
    classGroup.divisions.map((div: any) => ({
      id: div.id,
      label: `${classGroup.className} - ${div.division}`
    }))
  );

  return (
    <div className="space-y-6" dir="rtl">
      {isProcessing && <LoadingOverlay message="جاري معالجة الملف..." />}
      
      <div>
        <h1 className="text-3xl font-bold text-foreground">التجهيزات الأساسية</h1>
        <p className="text-muted-foreground mt-2">
          يرجى كتابة اسم المديرية والمدرسة بالكامل وبشكل صحيح. كما يجب أن تكون أسماء المواد مطابقة تماماً لأسمائها الفعلية.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>رفع ملف الطلبة</CardTitle>
          <CardDescription>قم برفع كشف الطلبة من منصة أجيال (Excel)</CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="mt-4 space-y-3">
              {parsedData && (
                <div className="p-3 bg-chart-1/10 border border-chart-1/20 rounded-lg">
                  <div className="flex items-center gap-2 text-chart-1">
                    <i className="fas fa-check-circle"></i>
                    <span className="font-medium">
                      تم استخلاص {parsedData.students.length} طالب/ة من {parsedData.classes.length} صف
                    </span>
                  </div>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-lg space-y-2">
                  <div className="font-semibold">تحذيرات في الملف</div>
                  <ul className="list-disc pr-6 space-y-1">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm leading-relaxed">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المعلم والمدرسة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <Label htmlFor="homeroom-switch" className="text-base font-medium">
                هل أنت مربي صف؟
              </Label>
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
                <SelectContent>
                  {availableClasses.map(cls => (
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

      <Card>
        <CardHeader>
          <CardTitle>الصفوف والمواد</CardTitle>
          <CardDescription>
            {classes.length === 0 ? "سيتم عرض الصفوف بعد رفع ملف الطلبة" : "أضف المواد الدراسية لكل صف وشعبة"}
          </CardDescription>
        </CardHeader>
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <Label htmlFor="homeroom-switch" className="text-base font-medium">
              هل أنت مربي صف؟
            </Label>
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
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <CardContent className="mt-4">
          <ClassSubjectManager
            classes={classes}
            onUpdate={setClasses}
            students={parsedData?.students || []}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          حفظ التجهيزات
        </Button>
        <Button variant="outline" onClick={handleReset} data-testid="button-reset">
          <RefreshCcw className="w-4 h-4 ml-2" />
          إعادة تعيين
        </Button>
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
