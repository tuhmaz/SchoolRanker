import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Save, RefreshCcw, Printer, ArrowUp, Sparkles, UploadCloud, Layers, Book, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, parseUnifiedReport, type ParsedData } from "@/lib/excelParser";
import * as XLSX from "xlsx";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const LEGACY_STORAGE_KEY = "appSettings";
const UNIFIED_STORAGE_KEY = "unifiedSetupSettings";

export default function CombinedSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("agial");

  // Agial tab state
  const [agialFile, setAgialFile] = useState<File | null>(null);
  const [agialProcessing, setAgialProcessing] = useState(false);
  const [agialTeacherName, setAgialTeacherName] = useState("");
  const [agialDirectorate, setAgialDirectorate] = useState("");
  const [agialSchool, setAgialSchool] = useState("");
  const [agialTown, setAgialTown] = useState("");
  const [agialIsHomeroom, setAgialIsHomeroom] = useState(false);
  const [agialHomeroomClass, setAgialHomeroomClass] = useState("");
  const [agialParsedData, setAgialParsedData] = useState<ParsedData | null>(null);
  const [agialClasses, setAgialClasses] = useState<any[]>([]);
  const [agialWarnings, setAgialWarnings] = useState<string[]>([]);

  // EL tab state
  const [elFile, setElFile] = useState<File | null>(null);
  const [elProcessing, setElProcessing] = useState(false);
  const [elTeacherName, setElTeacherName] = useState("");
  const [elDirectorate, setElDirectorate] = useState("");
  const [elSchool, setElSchool] = useState("");
  const [elTown, setElTown] = useState("");
  const [elIsHomeroom, setElIsHomeroom] = useState(false);
  const [elHomeroomClass, setElHomeroomClass] = useState("");
  const [elParsedData, setElParsedData] = useState<ParsedData | null>(null);
  const [elClasses, setElClasses] = useState<any[]>([]);
  const [elWarnings, setElWarnings] = useState<string[]>([]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isSyncingAgial, setIsSyncingAgial] = useState(false);
  const [isSyncingEl, setIsSyncingEl] = useState(false);

  // Load Agial settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setAgialTeacherName(saved.teacherName ?? "");
      setAgialDirectorate(saved.directorate ?? "");
      setAgialSchool(saved.school ?? "");
      setAgialTown(saved.town ?? "");
      setAgialIsHomeroom(!!saved.isHomeroom);
      setAgialHomeroomClass(saved.homeroomClass ?? "");
      setAgialClasses(Array.isArray(saved.classes) ? saved.classes : []);
      setAgialWarnings(Array.isArray(saved.warnings) ? saved.warnings : []);
      const students = Array.isArray(saved.students) ? saved.students : [];
      setAgialParsedData({ students, classes: Array.isArray(saved.classes) ? saved.classes : [] });
    } catch {
      // ignore
    }
  }, []);

  // Load EL settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UNIFIED_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setElTeacherName(saved.teacherName ?? "");
      setElDirectorate(saved.directorate ?? saved.schoolInfo?.directorate ?? "");
      setElSchool(saved.school ?? saved.schoolInfo?.school ?? "");
      setElTown(saved.town ?? "");
      setElIsHomeroom(!!saved.isHomeroom);
      setElHomeroomClass(saved.homeroomClass ?? "");
      setElClasses(Array.isArray(saved.classes) ? saved.classes : []);
      setElWarnings(Array.isArray(saved.warnings) ? saved.warnings : []);
      const students = Array.isArray(saved.students) ? saved.students : [];
      setElParsedData({ students, classes: Array.isArray(saved.classes) ? saved.classes : [], schoolInfo: saved.schoolInfo });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Agial file handlers
  const ensureColumnExists = async (file: File, matchers: RegExp[], errorMessage: string) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    if (!workbook.SheetNames.length) {
      throw new Error("الملف لا يحتوي على أي أوراق عمل صالحة.");
    }

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
      for (let rowIndex = 0; rowIndex < Math.min(rows.length, 120); rowIndex++) {
        const row = rows[rowIndex];
        if (!row) continue;
        for (const cell of row) {
          const text = String(cell ?? "").trim();
          if (!text) continue;
          if (matchers.some((regex) => regex.test(text))) {
            return;
          }
        }
      }
    }

    throw new Error(errorMessage);
  };

  const handleAgialFileSelect = async (selectedFile: File) => {
    try {
      await ensureColumnExists(
        selectedFile,
        [/رقم\s*(الإثبات|الهوية)/i],
        "الملف لا يحتوي على عمود رقم الإثبات المطلوب. يرجى استخدام كشف من حساب المدرسة الرسمي."
      );
    } catch (validationError: any) {
      handleUploadError(validationError?.message || "يتعين وجود عمود رقم الإثبات قبل رفع الملف.");
      return;
    }

    setAgialFile(selectedFile);
    setAgialProcessing(true);
    try {
      const data = await parseExcelFile(selectedFile);
      setAgialParsedData(data);
      setAgialClasses(data.classes);
      setAgialWarnings(data.warnings ?? []);
      toast({
        title: "تم التحميل بنجاح",
        description: `تم استخلاص ${data.students.length} طالب/ة من ${data.classes.length} صف`,
        variant: "success",
      });
      if (data.warnings?.length) {
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
      setAgialFile(null);
    } finally {
      setAgialProcessing(false);
    }
  };

  // EL file handlers
  const handleElFileSelect = async (selectedFile: File) => {
    try {
      await ensureColumnExists(
        selectedFile,
        [/الرقم\s*الوطني/i, /رقم\s*وطني/i],
        " الملف لا يحتوي على عمود الرقم الوطني المطلوب. يرجى استخدام نموذج الرسمي او استخدام ملف منصة أجيال النموذج الأول"
      );
    } catch (validationError: any) {
      handleUploadError(validationError?.message || "الملف لا يحتوي على خانة رقم الإثبات المطلوبة.");
      return;
    }

    setElFile(selectedFile);
    setElProcessing(true);
    try {
      const data = await parseUnifiedReport(selectedFile);
      setElParsedData(data);
      setElClasses(data.classes);
      setElWarnings(data.warnings ?? []);
      toast({
        title: "تم التحميل بنجاح",
        description: `تم استخلاص ${data.students.length} طالب/ة من ${data.classes.length} صف من نموذج EL_StudentInfoReport`,
        variant: "success",
      });
      if (data.warnings?.length) {
        toast({
          title: "تحذيرات في الملف",
          description: data.warnings.join("\n"),
          variant: "warning",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في معالجة الملف",
        description: error.message || "حدث خطأ أثناء قراءة نموذج EL_StudentInfoReport",
        variant: "destructive",
      });
      setElFile(null);
    } finally {
      setElProcessing(false);
    }
  };

  const handleAgialSave = () => {
    const settings = {
      teacherName: agialTeacherName,
      directorate: agialDirectorate,
      school: agialSchool,
      town: agialTown,
      isHomeroom: agialIsHomeroom,
      homeroomClass: agialHomeroomClass,
      classes: agialClasses,
      students: agialParsedData?.students || [],
      warnings: agialWarnings,
    };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(settings));
    toast({
      title: "تم الحفظ بنجاح",
      description: "تم حفظ تجهيزات ملف أجيال",
      variant: "success",
    });
  };

  const handleAgialSyncToDashboard = async () => {
    if (isSyncingAgial) return;
    const students = (agialParsedData?.students ?? []).map((student: any) => {
      const primary = typeof student?.nationalId === "string" ? student.nationalId.trim() : "";
      if (primary) return { ...student, nationalId: primary };

      const altKeys = [
        "idNumber",
        "nationalID",
        "national_id",
        "proofNumber",
        "proofNo",
        "identityNumber",
        "idNo",
      ];
      for (const key of altKeys) {
        const value = student?.[key];
        if (value == null) continue;
        const normalized = String(value).trim();
        if (normalized) return { ...student, nationalId: normalized };
      }

      const idValue = typeof student?.id === "string" ? student.id.trim() : "";
      if (idValue && !/^student-|^sheet-/.test(idValue)) {
        return { ...student, nationalId: idValue };
      }

      return student;
    });
    if (students.length === 0 || agialClasses.length === 0) {
      toast({
        title: "لا توجد بيانات للمزامنة",
        description: "ارفع الملف وأكمل استخراج الصفوف والطلاب أولاً.",
        variant: "destructive",
      });
      return;
    }
    setIsSyncingAgial(true);
    try {
      await apiRequest("PUT", "/api/dashboard/records", {
        teacherName: agialTeacherName,
        directorate: agialDirectorate,
        school: agialSchool,
        town: agialTown,
        isHomeroom: agialIsHomeroom,
        homeroomClass: agialHomeroomClass,
        students,
        classes: agialClasses,
        source: "combined-settings-agial",
      });
      toast({
        title: "تمت المزامنة",
        description: "تم إرسال بيانات أجيال إلى لوحة التحكم.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "تعذر المزامنة",
        description: String(err?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsSyncingAgial(false);
    }
  };

  const handleAgialReset = () => {
    setAgialFile(null);
    setAgialTeacherName("");
    setAgialDirectorate("");
    setAgialSchool("");
    setAgialTown("");
    setAgialIsHomeroom(false);
    setAgialHomeroomClass("");
    setAgialClasses([]);
    setAgialParsedData(null);
    setAgialWarnings([]);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    toast({
      title: "تم المسح",
      description: "تم مسح جميع تجهيزات ملف أجيال",
      variant: "warning",
    });
  };

  const handleElSave = () => {
    const settings = {
      teacherName: elTeacherName,
      directorate: elDirectorate,
      school: elSchool,
      town: elTown,
      isHomeroom: elIsHomeroom,
      homeroomClass: elHomeroomClass,
      classes: elClasses,
      students: elParsedData?.students ?? [],
      warnings: elWarnings,
      schoolInfo: elParsedData?.schoolInfo,
    };
    localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(settings));
    toast({
      title: "تم الحفظ بنجاح",
      description: "تم حفظ تجهيزات النموذج الثاني",
      variant: "success",
    });
  };

  const handleElSyncToDashboard = async () => {
    if (isSyncingEl) return;
    const students = (elParsedData?.students ?? []).map((student: any) => {
      const primary = typeof student?.nationalId === "string" ? student.nationalId.trim() : "";
      if (primary) return { ...student, nationalId: primary };

      const altKeys = [
        "idNumber",
        "nationalID",
        "national_id",
        "proofNumber",
        "proofNo",
        "identityNumber",
        "idNo",
      ];
      for (const key of altKeys) {
        const value = student?.[key];
        if (value == null) continue;
        const normalized = String(value).trim();
        if (normalized) return { ...student, nationalId: normalized };
      }

      const idValue = typeof student?.id === "string" ? student.id.trim() : "";
      if (idValue && !/^student-|^sheet-/.test(idValue)) {
        return { ...student, nationalId: idValue };
      }

      return student;
    });
    const schoolInfoRaw: any = elParsedData?.schoolInfo;
    const safeSchoolInfo =
      schoolInfoRaw &&
      typeof schoolInfoRaw?.directorate === "string" &&
      typeof schoolInfoRaw?.school === "string" &&
      typeof schoolInfoRaw?.program === "string"
        ? {
            directorate: schoolInfoRaw.directorate.trim(),
            school: schoolInfoRaw.school.trim(),
            program: schoolInfoRaw.program.trim(),
          }
        : undefined;
    if (students.length === 0 || elClasses.length === 0) {
      toast({
        title: "لا توجد بيانات للمزامنة",
        description: "ارفع الملف وأكمل استخراج الصفوف والطلاب أولاً.",
        variant: "destructive",
      });
      return;
    }
    setIsSyncingEl(true);
    try {
      await apiRequest("PUT", "/api/dashboard/records", {
        teacherName: elTeacherName,
        directorate: elDirectorate,
        school: elSchool,
        town: elTown,
        isHomeroom: elIsHomeroom,
        homeroomClass: elHomeroomClass,
        ...(safeSchoolInfo ? { schoolInfo: safeSchoolInfo } : {}),
        students,
        classes: elClasses,
        source: "combined-settings-el",
      });
      toast({
        title: "تمت المزامنة",
        description: "تم إرسال بيانات النموذج الثاني إلى لوحة التحكم.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "تعذر المزامنة",
        description: String(err?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsSyncingEl(false);
    }
  };

  const handleElReset = () => {
    setElFile(null);
    setElTeacherName("");
    setElDirectorate("");
    setElSchool("");
    setElTown("");
    setElIsHomeroom(false);
    setElHomeroomClass("");
    setElClasses([]);
    setElParsedData(null);
    setElWarnings([]);
    localStorage.removeItem(UNIFIED_STORAGE_KEY);
    toast({
      title: "تم المسح",
      description: "تم مسح جميع تجهيزات النموذج الثاني",
      variant: "warning",
    });
  };

  const handleUploadError = (message: string) => {
    toast({
      title: "تعذر رفع الملف",
      description: message,
      variant: "destructive",
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const agialAvailableClasses = useMemo(
    () =>
      agialClasses.flatMap((classGroup) =>
        classGroup.divisions.map((div: any) => ({
          id: div.id,
          label: `${classGroup.className} - ${div.division}`,
        }))
      ),
    [agialClasses]
  );

  const elAvailableClasses = useMemo(
    () =>
      elClasses.flatMap((classGroup) =>
        classGroup.divisions.map((div: any) => ({
          id: div.id,
          label: `${classGroup.className} - ${div.division}`,
        }))
      ),
    [elClasses]
  );

  return (
    <div className="space-y-8" dir="rtl">
      {(agialProcessing || elProcessing) && <LoadingOverlay message="جاري معالجة الملف..." />}

      <section className="rounded-3xl border border-border/60 bg-gradient-to-b from-primary/10 via-muted/40 to-background px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" /> منطقة التجهيز المركزي
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">التجهيزات الأساسية</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              جهّز بيانات المدرسة من خلال رفع ملف منصة أجيال (النموذج الأول أو النموذج الثاني). اختر التبويب المناسب للملف الذي تريد رفعه.
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="agial" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
            <UploadCloud className="h-4 w-4" />
            ملف منصة أجيال
          </TabsTrigger>
          <TabsTrigger value="el" className="gap-2 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-400">
            <Shield className="h-4 w-4" />
            ملف منصة أجيال - النموذج الثاني
          </TabsTrigger>
        </TabsList>

        {/* Agial Tab */}
        <TabsContent value="agial" className="space-y-6">
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
                  onFileSelect={handleAgialFileSelect}
                  selectedFile={agialFile}
                  onClearFile={() => {
                    setAgialFile(null);
                    setAgialClasses([]);
                    setAgialParsedData(null);
                  }}
                  disabled={agialProcessing}
                  onError={handleUploadError}
                />
                {(agialParsedData || agialWarnings.length > 0) && (
                  <div className="space-y-3">
                    {agialParsedData && (
                      <div className="rounded-xl border border-chart-1/30 bg-chart-1/10 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-chart-1">
                          <Sparkles className="h-4 w-4" />
                          <span className="font-medium">
                            تم استخلاص {agialParsedData.students.length} طالب/ة من {agialParsedData.classes.length} صف
                          </span>
                        </div>
                      </div>
                    )}
                    {agialWarnings.length > 0 && (
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100">
                        <div className="font-semibold">تحذيرات في الملف</div>
                        <ul className="list-disc pr-6 text-sm leading-relaxed">
                          {agialWarnings.map((warning, idx) => (
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
                    <Label htmlFor="agial-teacher-name">اسم المعلم</Label>
                    <Input
                      id="agial-teacher-name"
                      value={agialTeacherName}
                      onChange={(e) => setAgialTeacherName(e.target.value)}
                      placeholder="أدخل اسم المعلم"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agial-directorate">المديرية</Label>
                    <Input
                      id="agial-directorate"
                      value={agialDirectorate}
                      onChange={(e) => setAgialDirectorate(e.target.value)}
                      placeholder="أدخل اسم المديرية"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agial-school">المدرسة</Label>
                    <Input
                      id="agial-school"
                      value={agialSchool}
                      onChange={(e) => setAgialSchool(e.target.value)}
                      placeholder="أدخل اسم المدرسة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agial-town">البلدة</Label>
                    <Input
                      id="agial-town"
                      value={agialTown}
                      onChange={(e) => setAgialTown(e.target.value)}
                      placeholder="أدخل اسم البلدة"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="agial-homeroom-switch" className="text-base font-semibold text-foreground">
                      هل أنت مربي صف؟
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      سيؤدي تفعيل هذا الخيار إلى ربط التقارير بالصف الذي تشرف عليه بشكل مباشر.
                    </p>
                  </div>
                  <Switch
                    id="agial-homeroom-switch"
                    checked={agialIsHomeroom}
                    onCheckedChange={setAgialIsHomeroom}
                  />
                </div>

                {agialIsHomeroom && agialAvailableClasses.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="agial-homeroom-class">اختر صفك</Label>
                    <Select value={agialHomeroomClass} onValueChange={setAgialHomeroomClass}>
                      <SelectTrigger id="agial-homeroom-class">
                        <SelectValue placeholder="اختر صفك..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {agialAvailableClasses.map((cls) => (
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
                {agialClasses.length === 0
                  ? "سيتم عرض الصفوف بعد رفع ملف الطلبة"
                  : "انقر على الصف لفتح لوحة المواد الخاصة به"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-100">
                نصيحة: أضف المواد بصيغة موحّدة (مثل "اللغة العربية"، "الرياضيات") لتظهر بالشكل المطلوب في التقارير والدفاتر.
              </div>
              <ClassSubjectManager
                classes={agialClasses}
                onUpdate={setAgialClasses}
                students={agialParsedData?.students || []}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleAgialSave} className="gap-2">
              <Save className="w-4 h-4" />
              حفظ التجهيزات
            </Button>
            {user ? (
              <Button variant="secondary" onClick={handleAgialSyncToDashboard} disabled={isSyncingAgial} className="gap-2">
                {isSyncingAgial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                مزامنة إلى الداشبورد
              </Button>
            ) : null}
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
                  <AlertDialogDescription>
                    ستؤدي هذه الخطوة إلى حذف جميع التجهيزات الحالية لملف أجيال. هل ترغب بالمتابعة؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-start">
                  <AlertDialogCancel>تراجع</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAgialReset} className="bg-amber-600 hover:bg-amber-700">
                    مسح التجهيزات
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="secondary"
              onClick={handlePrintCover}
              disabled={!agialTeacherName || !agialSchool}
            >
              <Printer className="w-4 h-4 ml-2" />
              طباعة الغلاف
            </Button>
          </div>
        </TabsContent>

        {/* EL Tab */}
        <TabsContent value="el" className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="border-border/70 shadow-sm bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <UploadCloud className="h-5 w-5 text-primary" /> رفع ملف منصة أجيال - النموذج الثاني
                </CardTitle>
                <CardDescription>قم برفع ملف XLS / XLSX الذي يحتوي على كشف الطلبة (النموذج الثاني)
</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUploadZone
                  onFileSelect={handleElFileSelect}
                  selectedFile={elFile}
                  onClearFile={() => {
                    setElFile(null);
                    setElClasses([]);
                    setElParsedData(null);
                    setElWarnings([]);
                  }}
                  disabled={elProcessing}
                  onError={handleUploadError}
                />
                {(elParsedData || elWarnings.length > 0) && (
                  <div className="space-y-3">
                    {elParsedData && (
                      <div className="rounded-xl border border-chart-1/30 bg-chart-1/10 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-chart-1">
                          <Sparkles className="h-4 w-4" />
                          <span className="font-medium">
                            تم استخلاص {elParsedData.students.length} طالب/ة من {elParsedData.classes.length} صف
                          </span>
                        </div>
                      </div>
                    )}
                    {elWarnings.length > 0 && (
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100">
                        <div className="font-semibold">ملاحظات على التقرير</div>
                        <ul className="list-disc pr-6 text-sm leading-relaxed">
                          {elWarnings.map((warning, idx) => (
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
                    <li>لا تقم بتعديل أسماء الأعمدة داخل التقرير قبل الرفع.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Layers className="h-5 w-5 text-primary" /> معلومات المعلم والمدرسة
                </CardTitle>
                <CardDescription>ستُستخدم هذه البيانات في جميع التقارير والدفاتر.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="el-teacher-name">اسم المعلم</Label>
                    <Input
                      id="el-teacher-name"
                      value={elTeacherName}
                      onChange={(e) => setElTeacherName(e.target.value)}
                      placeholder="أدخل اسم المعلم"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="el-directorate">المديرية</Label>
                    <Input
                      id="el-directorate"
                      value={elDirectorate}
                      onChange={(e) => setElDirectorate(e.target.value)}
                      placeholder="اسم المديرية"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="el-school">المدرسة</Label>
                    <Input
                      id="el-school"
                      value={elSchool}
                      onChange={(e) => setElSchool(e.target.value)}
                      placeholder="اسم المدرسة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="el-town">البلدة</Label>
                    <Input
                      id="el-town"
                      value={elTown}
                      onChange={(e) => setElTown(e.target.value)}
                      placeholder="اسم البلدة"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="el-homeroom-switch" className="text-base font-semibold text-foreground">
                      هل أنت مربي صف؟
                    </Label>
                    <p className="text-xs text-muted-foreground">اختر الصف والشعبة الرئيسية التي ستنعكس في الغلاف.</p>
                  </div>
                  <Switch id="el-homeroom-switch" checked={elIsHomeroom} onCheckedChange={setElIsHomeroom} />
                </div>

                {elIsHomeroom && elAvailableClasses.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="el-homeroom-class">اختر صفك</Label>
                    <Select value={elHomeroomClass} onValueChange={setElHomeroomClass}>
                      <SelectTrigger id="el-homeroom-class">
                        <SelectValue placeholder="اختر صفك" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {elAvailableClasses.map((cls) => (
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
                {elClasses.length === 0
                  ? "سيتم عرض الصفوف والشعب تلقائياً بعد رفع التقرير"
                  : "انقر على كل صف لإدارة المواد المخصصة له"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-100">
                نصيحة: احتفظ بأسماء المواد موحّدة لتسهيل دمجها مع الصفحات الأخرى.
              </div>
              <ClassSubjectManager classes={elClasses} onUpdate={setElClasses} students={elParsedData?.students || []} />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleElSave} className="gap-2">
              <Save className="w-4 h-4" />
              حفظ التجهيزات
            </Button>
            {user ? (
              <Button variant="secondary" onClick={handleElSyncToDashboard} disabled={isSyncingEl} className="gap-2">
                {isSyncingEl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                مزامنة إلى الداشبورد
              </Button>
            ) : null}
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
                  <AlertDialogDescription>
                    سيتم حذف جميع التجهيزات المحفوظة للنموذج الثاني. هل ترغب بالمتابعة؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-start">
                  <AlertDialogCancel>تراجع</AlertDialogCancel>
                  <AlertDialogAction onClick={handleElReset} className="bg-amber-600 hover:bg-amber-700">
                    مسح التجهيزات
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="secondary" onClick={handlePrintCover} disabled={!elTeacherName || !elSchool}>
              <Printer className="w-4 h-4 ml-2" />
              طباعة الغلاف
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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
