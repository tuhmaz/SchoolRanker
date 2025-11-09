import type { ChangeEvent, JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { analyzeGradebookFile, type GradebookAnalysis, type GradebookStudent, type TermKey } from "@/lib/gradebookAnalyzer";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ChevronDown, Download, FileSpreadsheet, Loader2, Table as TableIcon } from "lucide-react";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { AdSlot } from "@/components/ads/AdSlot";
import { AD_SLOTS } from "@/config/ads";

const TERM_LABELS: Record<TermKey, string> = {
  first: "الفصل الأول",
  second: "الفصل الثاني",
  average: "المعدل",
};

type StaticFieldKey = "serial" | "name" | "nationality" | "birthPlace";
type MetricFieldKey =
  | "respect"
  | "absenceDays"
  | "repeatedGrades"
  | "completionResult"
  | "total"
  | "percentage"
  | "annualResult";

const INFO_DISPLAY_ORDER: Array<{ key: keyof GradebookAnalysis["info"]; label: string }> = [
  { key: "directorate", label: "مديرية التربية والتعليم" },
  { key: "district", label: "اللواء" },
  { key: "town", label: "البلدة" },
  { key: "school", label: "المدرسة" },
  { key: "grade", label: "الصف" },
  { key: "division", label: "الشعبة" },
  { key: "program", label: "البرنامج" },
];

const STATIC_COLUMNS: ReadonlyArray<{ key: StaticFieldKey; label: string }> = [
  { key: "serial", label: "الرقم المتسلسل" },
  { key: "name", label: "الاسم" },
  { key: "nationality", label: "الجنسية" },
  { key: "birthPlace", label: "مكان الولادة" },
];

const METRIC_COLUMNS: ReadonlyArray<{ key: MetricFieldKey; label: string }> = [
  { key: "respect", label: "احترام النظام" },
  { key: "absenceDays", label: "أيام الغياب" },
  { key: "repeatedGrades", label: "الصفوف المعادة" },
  { key: "completionResult", label: "نتيجة الإكمال" },
  { key: "total", label: "المجموع العام" },
  { key: "percentage", label: "المعدل العام المئوي" },
  { key: "annualResult", label: "النتيجة السنوية" },
];

type CertificateSubjectGrade = {
  name: string;
  first?: string;
  second?: string;
  average?: string;
  maxScore?: string;
  minScore?: string;
};

type CertificateStudentPayload = {
  id: string;
  name: string;
  serialNumber?: string;
  nationalId?: string;
  nationality?: string;
  className?: string;
  division?: string;
  birthPlace?: string;
  birthDay?: string;
  birthMonth?: string;
  birthYear?: string;
  birthDate?: string;
  religion?: string;
  address?: string;
  respect?: string;
  totalScore?: string;
  percentage?: string;
  annualResult?: string;
  absenceDays?: string;
  notes?: string;
  subjects?: CertificateSubjectGrade[];
};

type CertificateExportPayload = {
  info?: {
    directorate?: string;
    town?: string;
    district?: string;
    schoolName?: string;
    schoolAddress?: string;
    schoolPhone?: string;
    schoolNationalId?: string;
    grade?: string;
    division?: string;
    academicYear?: string;
    homeroomTeacher?: string;
    principalName?: string;
    stampLabel?: string;
    officialDays?: string;
    defaultReligion?: string;
    completionExamStartDay?: string;
    completionExamStartDate?: string;
    completionExamEndDay?: string;
    completionExamEndDate?: string;
    bookDeliveryStartDay?: string;
    bookDeliveryStartDate?: string;
    bookDeliveryEndDay?: string;
    bookDeliveryEndDate?: string;
    termStartDay?: string;
    termStartDate?: string;
  };
  students: CertificateStudentPayload[];
  variant?: "final" | "first-term";
};

type CertificateOptionalFields = {
  defaultReligion?: string;
  completionExamStartDay?: string;
  completionExamStartDate?: string;
  completionExamEndDay?: string;
  completionExamEndDate?: string;
  bookDeliveryStartDay?: string;
  bookDeliveryStartDate?: string;
  bookDeliveryEndDay?: string;
  bookDeliveryEndDate?: string;
  termStartDay?: string;
  termStartDate?: string;
  academicYear?: string;
  homeroomTeacher?: string;
  principalName?: string;
};

const CERTIFICATE_OPTIONS_STORAGE_KEY = "certificateOptions";

const sanitizeValue = (value?: string | number | null) => {
  if (value == null) return undefined;
  const text = String(value).trim();
  if (!text || text === "—") return undefined;
  return text;
};

const parseNumber = (value?: string | number | null): number | null => {
  if (value == null) return null;
  const text = String(value)
    .replace(/[^0-9.,-٠-٩۰-۹]/g, "")
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 1776))
    .replace(/,/g, ".")
    .trim();
  if (!text) return null;
  const numeric = Number.parseFloat(text);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatNumber = (value: number): string => {
  return value.toFixed(1).replace(/\.0$/, "");
};

const buildCertificatePayload = (
  analysis: GradebookAnalysis,
  settings?: Record<string, any> | null,
): CertificateExportPayload => {
  const students = analysis.students.map((student, index) => {
    const serial = sanitizeValue(student.serial);
    const name = sanitizeValue(student.name) ?? `طالب/ة ${index + 1}`;
    const grade = sanitizeValue(analysis.info.grade);
    const division = sanitizeValue(analysis.info.division);

    let firstTermObtainedTotal = 0;
    let firstTermMaxTotal = 0;

    const subjectEntries: CertificateSubjectGrade[] = analysis.subjects.map((subject) => {
      const record = student.subjects?.[subject.name] ?? {};
      const entry: CertificateSubjectGrade = { name: subject.name };
      if (subject.maxScore) entry.maxScore = subject.maxScore;
      if (subject.minScore) entry.minScore = subject.minScore;
      const first = sanitizeValue(record.first);
      const second = sanitizeValue(record.second);
      const average = sanitizeValue(record.average);
      if (first) entry.first = first;
      if (second) entry.second = second;
      if (average) entry.average = average;

      const firstNumeric = parseNumber(first);
      const maxNumeric = parseNumber(subject.maxScore);
      if (firstNumeric != null && maxNumeric != null && maxNumeric > 0) {
        firstTermObtainedTotal += firstNumeric;
        firstTermMaxTotal += maxNumeric;
      }
      return entry;
    });

    const noteParts: string[] = [];
    const repeatedGrades = sanitizeValue(student.repeatedGrades);
    if (repeatedGrades) noteParts.push(`الصفوف المعادة: ${repeatedGrades}`);
    const completionResult = sanitizeValue(student.completionResult);
    if (completionResult) noteParts.push(`نتيجة الإكمال: ${completionResult}`);

    const birthDay = sanitizeValue(student.birthDay);
    const birthMonth = sanitizeValue(student.birthMonth);
    const birthYear = sanitizeValue(student.birthYear);
    const birthDate = [birthDay, birthMonth, birthYear].filter(Boolean).join("/") || undefined;

    const existingTotal = sanitizeValue(student.total);
    const existingTotalNumeric = parseNumber(existingTotal);
    const existingPercentage = sanitizeValue(student.percentage);
    const existingPercentageNumeric = parseNumber(existingPercentage);

    const computedPercentage =
      firstTermMaxTotal > 0 ? (firstTermObtainedTotal / firstTermMaxTotal) * 100 : null;

    const finalTotal =
      existingTotalNumeric != null && existingTotalNumeric > 0
        ? formatNumber(existingTotalNumeric)
        : firstTermObtainedTotal > 0
          ? formatNumber(firstTermObtainedTotal)
          : undefined;

    const finalPercentage =
      existingPercentageNumeric != null && existingPercentageNumeric > 0
        ? formatNumber(existingPercentageNumeric)
        : computedPercentage != null
          ? formatNumber(computedPercentage)
          : undefined;

    return {
      id: serial ?? `${name}-${index + 1}`,
      name,
      serialNumber: serial,
      nationality: sanitizeValue(student.nationality),
      className: grade,
      division,
      birthPlace: sanitizeValue(student.birthPlace),
      birthDay,
      birthMonth,
      birthYear,
      birthDate,
      respect: sanitizeValue(student.respect),
      totalScore: finalTotal,
      percentage: finalPercentage,
      annualResult: sanitizeValue(student.annualResult),
      absenceDays: sanitizeValue(student.absenceDays),
      notes: noteParts.length > 0 ? noteParts.join("\n") : undefined,
      subjects: subjectEntries,
    };
  });

  const info = {
    directorate: sanitizeValue(analysis.info.directorate) ?? sanitizeValue(settings?.directorate),
    town: sanitizeValue(analysis.info.town) ?? sanitizeValue(settings?.town),
    district: sanitizeValue(analysis.info.district) ?? sanitizeValue(settings?.district),
    schoolName: sanitizeValue(analysis.info.school) ?? sanitizeValue(settings?.school),
    schoolAddress:
      sanitizeValue(settings?.schoolAddress)
        ?? sanitizeValue(settings?.schoolInfo?.address)
        ?? sanitizeValue(analysis.info.town),
    schoolPhone: sanitizeValue(settings?.schoolPhone) ?? sanitizeValue(settings?.schoolInfo?.phone),
    schoolNationalId:
      sanitizeValue(settings?.schoolNationalId) ?? sanitizeValue(settings?.schoolInfo?.nationalId),
    grade: sanitizeValue(analysis.info.grade),
    division: sanitizeValue(analysis.info.division),
    academicYear:
      sanitizeValue(settings?.academicYear)
        ?? sanitizeValue(settings?.year),
    homeroomTeacher:
      sanitizeValue(settings?.homeroomTeacher)
        ?? sanitizeValue(settings?.teacherName),
    principalName:
      sanitizeValue(settings?.principalName)
        ?? sanitizeValue(settings?.principal)
        ?? sanitizeValue(settings?.principalManager),
    stampLabel: sanitizeValue(settings?.stampLabel),
    officialDays: sanitizeValue(settings?.officialDays),
    defaultReligion: sanitizeValue(settings?.defaultReligion),
    completionExamStartDay: sanitizeValue(settings?.completionExamStartDay),
    completionExamStartDate: sanitizeValue(settings?.completionExamStartDate),
    completionExamEndDay: sanitizeValue(settings?.completionExamEndDay),
    completionExamEndDate: sanitizeValue(settings?.completionExamEndDate),
    bookDeliveryStartDay: sanitizeValue(settings?.bookDeliveryStartDay),
    bookDeliveryStartDate: sanitizeValue(settings?.bookDeliveryStartDate),
    bookDeliveryEndDay: sanitizeValue(settings?.bookDeliveryEndDay),
    bookDeliveryEndDate: sanitizeValue(settings?.bookDeliveryEndDate),
    termStartDay: sanitizeValue(settings?.termStartDay),
    termStartDate: sanitizeValue(settings?.termStartDate),
  } satisfies CertificateExportPayload["info"];

  return { info, students };
};

export default function GradebookAnalyzerPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<GradebookAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOverlay, setShowExportOverlay] = useState(false);
  const [exportCountdown, setExportCountdown] = useState(0);
  const [certificateVariant, setCertificateVariant] = useState<"final" | "first-term">("final");
  const [showPrintOptions, setShowPrintOptions] = useState(true);
  const [certificateOptions, setCertificateOptions] = useState<CertificateOptionalFields>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(CERTIFICATE_OPTIONS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as CertificateOptionalFields;
      }
    } catch (_) {
      // ignore corrupted storage
    }
    return {};
  });
  const hasCertificateOptionValues = Object.keys(certificateOptions).length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (hasCertificateOptionValues) {
        window.localStorage.setItem(
          CERTIFICATE_OPTIONS_STORAGE_KEY,
          JSON.stringify(certificateOptions),
        );
      } else {
        window.localStorage.removeItem(CERTIFICATE_OPTIONS_STORAGE_KEY);
      }
    } catch (_) {
      // ignore storage errors
    }
  }, [certificateOptions, hasCertificateOptionValues]);

  const handleCertificateOptionInput = (key: keyof CertificateOptionalFields) => (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const rawValue = event.target.value;
    const trimmedValue = rawValue.trim();
    setCertificateOptions((prev) => {
      const next: CertificateOptionalFields = { ...prev };
      if (!trimmedValue) {
        delete next[key];
      } else {
        next[key] = rawValue;
      }
      return next;
    });
  };

  const handleResetCertificateOptions = () => {
    setCertificateOptions({});
  };

  const getOptionalInputClasses = (value?: string) => {
    return value && value.trim()
      ? "border-emerald-500 focus-visible:ring-emerald-500"
      : undefined;
  };

  useEffect(() => {
    if (!showExportOverlay) return;
    const interval = window.setInterval(() => {
      setExportCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [showExportOverlay]);

  const infoBadges = useMemo(() => {
    if (!analysis) return [];
    return INFO_DISPLAY_ORDER.filter((item) => analysis.info[item.key])
      .map((item) => ({ label: item.label, value: analysis.info[item.key] as string }));
  }, [analysis]);

  const hasSecondTermData = useMemo(() => {
    if (!analysis) return false;
    return analysis.terms.includes("second") || analysis.terms.includes("average");
  }, [analysis]);

  const cardSurfaceClass = "bg-white shadow-sm border-border/60 dark:border-border/70 dark:bg-muted/10";

  useEffect(() => {
    if (!hasSecondTermData && certificateVariant !== "first-term") {
      setCertificateVariant("first-term");
    }
  }, [hasSecondTermData, certificateVariant]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const result = await analyzeGradebookFile(selectedFile);
      setAnalysis(result);
      const detectedSecondTerm = result.terms.includes("second") || result.terms.includes("average");
      setCertificateVariant(detectedSecondTerm ? "final" : "first-term");
      toast({
        title: "تم التحليل بنجاح",
        description: `تم التعرف على ${result.students.length} طالب/ة و ${result.subjects.length} مادة دراسية`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "خطأ أثناء التحليل",
        description: error?.message ?? "تعذر تحليل ملف جدول العلامات",
        variant: "destructive",
      });
      setAnalysis(null);
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setAnalysis(null);
    setCertificateVariant("final");
  };

  const handleExportCertificates = async () => {
    if (!analysis) return;
    if (analysis.students.length === 0) {
      toast({
        title: "لا توجد سجلات",
        description: "يجب أن يحتوي التحليل على طلاب قبل تصدير الشهادات",
        variant: "destructive",
      });
      return;
    }

    if (isExporting) return;

    const WAIT_SECONDS = 20;

    try {
      setIsExporting(true);
      setExportCountdown(WAIT_SECONDS);
      setShowExportOverlay(true);
      toast({
        title: "جاري تجهيز الشهادات",
        description: "سيتم إنشاء ملف Excel مع المحافظة على تصميم القالب",
      });

      let storedSettings: Record<string, any> | null = null;
      try {
        const raw = localStorage.getItem("appSettings");
        if (raw) storedSettings = JSON.parse(raw);
      } catch (_) {
        storedSettings = null;
      }

      const settingsForPayload = {
        ...(storedSettings ?? {}),
        ...certificateOptions,
      };

      const payload: CertificateExportPayload = {
        ...buildCertificatePayload(analysis, settingsForPayload),
        variant: certificateVariant,
      };
      let filename: string | undefined;
      let fileBlob: Blob | null = null;
      let exportError: Error | null = null;

      const minDelay = new Promise((resolve) => {
        window.setTimeout(resolve, WAIT_SECONDS * 1000);
      });

      const exportTask = (async () => {
        try {
          const response = await fetch("/api/export/certificate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await response.json().catch(() => null);
          if (!response.ok || !data) {
            throw new Error(data?.message || "تعذر إنشاء ملف الشهادات");
          }
          if (!data.id) {
            throw new Error("الاستجابة من الخادم غير صالحة");
          }

          const downloadResponse = await fetch(`/api/export/certificate?id=${encodeURIComponent(data.id)}`);
          if (!downloadResponse.ok) {
            throw new Error("فشل تحميل ملف الشهادات");
          }

          const blob = await downloadResponse.blob();
          fileBlob = blob;
          filename = data.filename as string | undefined;
        } catch (error: any) {
          exportError = error instanceof Error ? error : new Error(error?.message || "تعذر إنشاء ملف الشهادات");
        }
      })();

      await Promise.all([minDelay, exportTask]);

      if (exportError) {
        throw exportError;
      }

      if (fileBlob) {
        const url = window.URL.createObjectURL(fileBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || "شهادات_الطلبة.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "تم إنشاء الشهادات",
        description: filename ? `تم تنزيل ${filename}` : "تم تنزيل ملف الشهادات بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "تعذر تصدير الشهادات",
        description: error?.message || "حدث خطأ غير متوقع أثناء التصدير",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setShowExportOverlay(false);
      setExportCountdown(0);
    }
  };

  const renderSubjectRows = (student: GradebookStudent, analysis: GradebookAnalysis) => {
    return analysis.subjects.map((subject) => {
      const record = student.subjects?.[subject.name] ?? {};
      return (
        <tr key={`${student.serial}-${subject.name}`} className="border-t border-border/30">
          <td className="px-3 py-2 font-medium text-foreground">{subject.name}</td>
          {analysis.terms.map((term) => (
            <td key={`${student.serial}-${subject.name}-${term}`} className="px-3 py-2 text-center text-muted-foreground">
              {record?.[term] ?? "—"}
            </td>
          ))}
        </tr>
      );
    });
  };

  const getStudentFieldValue = (student: GradebookStudent, key: StaticFieldKey | MetricFieldKey) => {
    const value = student[key as keyof GradebookStudent];
    const normalized = sanitizeValue(value as string | number | null | undefined);
    return normalized ?? "—";
  };

  return (
    <div className="space-y-8" dir="rtl">
      {isProcessing && <LoadingOverlay message="جارٍ تحليل جدول العلامات..." />}
      {showExportOverlay && (
        <LoadingOverlay
          message={`جارٍ إنشاء الشهادات... يرجى الانتظار ${exportCountdown > 0 ? `${exportCountdown} ثانية` : "قليلًا"}`}
        >
          <div className="space-y-3">
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

      <section className="rounded-3xl border border-border/60 bg-gradient-to-b from-white via-white to-muted/20 px-6 py-8 shadow-lg dark:from-primary/20 dark:via-muted/20 dark:to-background sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <TableIcon className="h-4 w-4" /> إنشاء الشهادات الرئيسي
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">قراءة كاملة لجدول العلامات</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              ارفع ملف "جدول العلامات" وسيقوم النظام بتحليل جميع التفاصيل الثابتة والمتغيرة، بما في ذلك بيانات المدرسة، والمواد الدراسية، وعلامات الطلاب في الفصلين الأول والثاني ومتوسطهما.
            </p>
          </div>
          <div className="grid w-full gap-3 rounded-2xl border border-border/60 bg-white/85 p-4 text-sm shadow-sm dark:bg-muted/40 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">يدعم ملفات XLSX/XLS بصيغة منصة أجيال للصفوف الأساسية.</span>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">تأكد من اختيار ورقة "جدول العلامات" الأصلية بدون تعديلات يدوية.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className={`${cardSurfaceClass} border-border/70`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> رفع ملف جدول العلامات
            </CardTitle>
            <CardDescription>قم برفع الملف كما هو صادر من نظام أجيال لتحليله بشكل شامل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone
              onFileSelect={handleFileSelect}
              selectedFile={file}
              onClearFile={handleClear}
              disabled={isProcessing}
              onError={(message) =>
                toast({
                  title: "تعذر رفع الملف",
                  description: message,
                  variant: "destructive",
                })
              }
            />
            {analysis && (
              <div className="rounded-xl border border-chart-1/30 bg-chart-1/10 px-4 py-3 text-sm text-chart-1">
                تم تحليل {analysis.students.length} سجل طالب/ة مع {analysis.subjects.length} مادة دراسية.
              </div>
            )}
            {file && !analysis && !isProcessing && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                <AlertCircle className="h-4 w-4" />
                <span>لم يتم استخراج بيانات. تحقق من أن الملف يحتوي على ورقة "جدول العلامات" الصادرة عن النظام.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${cardSurfaceClass} border-border/70`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">كيف يتم التحليل؟</CardTitle>
            <CardDescription>
              يتم التعرف على بيانات المدرسة والمواد تلقائياً، ثم استخراج علامات الطلبة لكل مادة في الفصل الأول والثاني والمعدل.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-primary/10 p-1">
                <Loader2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">المرحلة 1 – قراءة بيانات المدرسة</p>
                <p>يتم استخراج المديرية، اللواء، المدرسة، الصف والشعبة من الجزء العلوي في الملف.</p>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-primary/10 p-1">
                <TableIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">المرحلة 2 – رسم خريطة المواد</p>
                <p>يتم ترتيب كل مادة مع فصولها (الأول، الثاني، المعدل) للتأكد من عرض العلامات حسب الترتيب الصحيح.</p>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-primary/10 p-1">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">المرحلة 3 – استخراج سجلات الطلبة</p>
                <p>لكل طالب، تُجمع البيانات الشخصية وعلامات المواد مع الحسابات النهائية (المجموع، المعدل، النتيجة السنوية).</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {analysis && (
        <section className="space-y-6">
          <Card className={`${cardSurfaceClass} border-border/70`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">بيانات المدرسة والصف</CardTitle>
              <CardDescription>القيم المستخرجة تلقائياً من رأس الجدول</CardDescription>
            </CardHeader>
            <CardContent>
              {infoBadges.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {infoBadges.map((item) => (
                    <Badge key={item.label} variant="outline" className="border-border/60 bg-muted/30 px-3 py-1 text-sm">
                      <span className="font-semibold text-foreground">{item.label}:</span>
                      <span className="mr-2 text-muted-foreground">{item.value}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لم يتم العثور على بيانات مدرسة واضحة في الصفحات الأولى من الملف.</p>
              )}
            </CardContent>
          </Card>

          <Card className={`${cardSurfaceClass} border-border/70`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">المواد الدراسية</CardTitle>
              <CardDescription>جميع المواد التي تم التعرف عليها مع فصولها الدراسية</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.subjects.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {analysis.subjects.map((subject) => (
                    <Badge key={subject.name} variant="secondary" className="bg-secondary/30 text-foreground">
                      {subject.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لم يتم التعرف على مواد دراسية في الجدول.</p>
              )}
            </CardContent>
          </Card>

          <Card className={`${cardSurfaceClass} border-border/70`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">نوع الشهادة</CardTitle>
              <CardDescription>اختر مجموعة القيم التي سيتم ملؤها داخل القالب</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  يمكنك إنشاء شهادة بنهاية العام أو شهادة للفصل الدراسي الأول باستخدام القالب نفسه.
                </p>
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant={certificateVariant === "final" ? "default" : "outline"}
                    onClick={() => setCertificateVariant("final")}
                    className="min-w-[150px]"
                    disabled={isExporting || !hasSecondTermData}
                  >
                    الشهادة النهائية
                  </Button>
                  <Button
                    type="button"
                    variant={certificateVariant === "first-term" ? "default" : "outline"}
                    onClick={() => setCertificateVariant("first-term")}
                    className="min-w-[150px]"
                    disabled={isExporting}
                  >
                    شهادة الفصل الأول
                  </Button>
                </div>
                {!hasSecondTermData && (
                  <p className="text-xs text-muted-foreground">
                    تم اكتشاف أن الملف يحتوي على بيانات الفصل الأول فقط، لذا تم تعطيل خيار الشهادة النهائية لتجنب التصدير الخاطئ.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardSurfaceClass} border-border/70`}>
            <Collapsible open={showPrintOptions} onOpenChange={setShowPrintOptions}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl text-destructive">خيارات الطباعة الإضافية</CardTitle>
                    <CardDescription>أدخل قيمًا اختيارية لتظهر داخل القالب عند تصدير الشهادات</CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleResetCertificateOptions}
                      disabled={!hasCertificateOptionValues}
                      data-testid="button-reset-print-options"
                    >
                      إعادة تعيين
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-sm"
                        data-testid="button-toggle-print-options"
                      >
                        {showPrintOptions ? "إخفاء الخيارات" : "عرض الخيارات"}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${showPrintOptions ? "rotate-180" : "rotate-0"}`}
                          aria-hidden="true"
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <CardContent className="space-y-6 pt-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default-religion">الديانة الافتراضية</Label>
                      <Input
                        id="default-religion"
                        value={certificateOptions.defaultReligion ?? ""}
                        onChange={handleCertificateOptionInput("defaultReligion")}
                        placeholder="مثال: الإسلام"
                        className={getOptionalInputClasses(certificateOptions.defaultReligion)}
                        data-testid="input-default-religion"
                      />
                      <p className="text-xs text-muted-foreground">
                        سيتم استخدامها تلقائياً للطلاب الذين لا تحتوي بياناتهم على خانة الديانة.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="academic-year">العام الدراسي</Label>
                      <Input
                        id="academic-year"
                        value={certificateOptions.academicYear ?? ""}
                        onChange={handleCertificateOptionInput("academicYear")}
                        placeholder="مثال: 2024/2025"
                        className={getOptionalInputClasses(certificateOptions.academicYear)}
                        data-testid="input-academic-year"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="homeroom-teacher">اسم مربي/مربية الصف</Label>
                      <Input
                        id="homeroom-teacher"
                        value={certificateOptions.homeroomTeacher ?? ""}
                        onChange={handleCertificateOptionInput("homeroomTeacher")}
                        placeholder="مثال: الأستاذة نور"
                        className={getOptionalInputClasses(certificateOptions.homeroomTeacher)}
                        data-testid="input-homeroom-teacher"
                      />
                      <p className="text-xs text-muted-foreground">يتم إدراج الاسم في   داخل الشهادة.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="principal-name">اسم مدير/مديرة المدرسة</Label>
                      <Input
                        id="principal-name"
                        value={certificateOptions.principalName ?? ""}
                        onChange={handleCertificateOptionInput("principalName")}
                        placeholder="مثال: الأستاذ سامي"
                        className={getOptionalInputClasses(certificateOptions.principalName)}
                        data-testid="input-principal-name"
                      />
                      <p className="text-xs text-muted-foreground">يتم إدراج الاسم في  داخل الشهادة.</p>
                    </div>
                  </div>

                  <Separator className="opacity-40" />

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">اختبارات الإكمال</p>
                      <p className="text-xs text-muted-foreground">يتم تكوين الجملة تلقائياً باستخدام القيم التالية.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="completion-start-day">اليوم (بداية الفترة)</Label>
                        <Input
                          id="completion-start-day"
                          value={certificateOptions.completionExamStartDay ?? ""}
                          onChange={handleCertificateOptionInput("completionExamStartDay")}
                          placeholder="مثال: الأحد"
                          className={getOptionalInputClasses(certificateOptions.completionExamStartDay)}
                          data-testid="input-completion-start-day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="completion-start-date">التاريخ الموافق (بداية)</Label>
                        <Input
                          id="completion-start-date"
                          value={certificateOptions.completionExamStartDate ?? ""}
                          onChange={handleCertificateOptionInput("completionExamStartDate")}
                          placeholder="مثال: 01/08/2025"
                          className={getOptionalInputClasses(certificateOptions.completionExamStartDate)}
                          data-testid="input-completion-start-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="completion-end-day">اليوم (نهاية الفترة)</Label>
                        <Input
                          id="completion-end-day"
                          value={certificateOptions.completionExamEndDay ?? ""}
                          onChange={handleCertificateOptionInput("completionExamEndDay")}
                          placeholder="مثال: الثلاثاء"
                          className={getOptionalInputClasses(certificateOptions.completionExamEndDay)}
                          data-testid="input-completion-end-day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="completion-end-date">التاريخ الموافق (نهاية)</Label>
                        <Input
                          id="completion-end-date"
                          value={certificateOptions.completionExamEndDate ?? ""}
                          onChange={handleCertificateOptionInput("completionExamEndDate")}
                          placeholder="مثال: 03/08/2025"
                          className={getOptionalInputClasses(certificateOptions.completionExamEndDate)}
                          data-testid="input-completion-end-date"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-40" />

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">تسليم الكتب المدرسية</p>
                      <p className="text-xs text-muted-foreground">املأ الفترة الزمنية ليتم إدراجها في السطر الثاني.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="books-start-day">اليوم (بداية الفترة)</Label>
                        <Input
                          id="books-start-day"
                          value={certificateOptions.bookDeliveryStartDay ?? ""}
                          onChange={handleCertificateOptionInput("bookDeliveryStartDay")}
                          placeholder="مثال: الأربعاء"
                          className={getOptionalInputClasses(certificateOptions.bookDeliveryStartDay)}
                          data-testid="input-books-start-day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="books-start-date">التاريخ الموافق (بداية)</Label>
                        <Input
                          id="books-start-date"
                          value={certificateOptions.bookDeliveryStartDate ?? ""}
                          onChange={handleCertificateOptionInput("bookDeliveryStartDate")}
                          placeholder="مثال: 10/08/2025"
                          className={getOptionalInputClasses(certificateOptions.bookDeliveryStartDate)}
                          data-testid="input-books-start-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="books-end-day">اليوم (نهاية الفترة)</Label>
                        <Input
                          id="books-end-day"
                          value={certificateOptions.bookDeliveryEndDay ?? ""}
                          onChange={handleCertificateOptionInput("bookDeliveryEndDay")}
                          placeholder="مثال: الخميس"
                          className={getOptionalInputClasses(certificateOptions.bookDeliveryEndDay)}
                          data-testid="input-books-end-day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="books-end-date">التاريخ الموافق (نهاية)</Label>
                        <Input
                          id="books-end-date"
                          value={certificateOptions.bookDeliveryEndDate ?? ""}
                          onChange={handleCertificateOptionInput("bookDeliveryEndDate")}
                          placeholder="مثال: 12/08/2025"
                          className={getOptionalInputClasses(certificateOptions.bookDeliveryEndDate)}
                          data-testid="input-books-end-date"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-40" />

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">بداية التدريس للفصل الأول</p>
                      <p className="text-xs text-muted-foreground">سيتم دمج هذه القيم مع العام الدراسي لإكمال السطر.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="term-start-day">اليوم</Label>
                        <Input
                          id="term-start-day"
                          value={certificateOptions.termStartDay ?? ""}
                          onChange={handleCertificateOptionInput("termStartDay")}
                          placeholder="مثال: الأحد"
                          className={getOptionalInputClasses(certificateOptions.termStartDay)}
                          data-testid="input-term-start-day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="term-start-date">التاريخ الموافق</Label>
                        <Input
                          id="term-start-date"
                          value={certificateOptions.termStartDate ?? ""}
                          onChange={handleCertificateOptionInput("termStartDate")}
                          placeholder="مثال: 01/09/2025"
                          className={getOptionalInputClasses(certificateOptions.termStartDate)}
                          data-testid="input-term-start-date"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <Card className={`${cardSurfaceClass} border-border/70`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">سجلات الطلبة التفصيلية</CardTitle>
              <CardDescription>يمكنك استعراض بيانات كل طالب من خلال الطي والفتح أدناه</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-3">
                {analysis.students.map((student, index) => {
                  const studentName = sanitizeValue(student.name) ?? `طالب/ة ${index + 1}`;
                  const accordionValue = student.serial || `student-${index}`;
                  const gradeDivision = [sanitizeValue(analysis.info.grade), sanitizeValue(analysis.info.division)]
                    .filter(Boolean)
                    .join(" / ");
                  const staticFields = STATIC_COLUMNS.map((column) => ({
                    label: column.label,
                    value: getStudentFieldValue(student, column.key),
                  }));
                  const metrics = METRIC_COLUMNS.map((column) => ({
                    label: column.label,
                    value: getStudentFieldValue(student, column.key),
                  }));

                  return (
                    <AccordionItem
                      key={accordionValue}
                      value={accordionValue}
                      className="rounded-2xl border border-border/60 bg-white shadow-sm dark:bg-muted/10"
                    >
                      <AccordionTrigger className="flex flex-col gap-1 px-4 py-3 text-right hover:no-underline">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-lg font-semibold text-foreground">{studentName}</span>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {student.serial && (
                              <span className="rounded-full bg-secondary/20 px-3 py-1 text-secondary-foreground">
                                الرقم المتسلسل: {student.serial}
                              </span>
                            )}
                            {gradeDivision && (
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                                {gradeDivision}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          اضغط لعرض بيانات الطالب التفصيلية
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {staticFields.map((field) => (
                              <div key={field.label} className="rounded-xl border border-border/40 bg-white px-3 py-2 text-sm shadow-xs dark:bg-background">
                                <div className="text-xs text-muted-foreground">{field.label}</div>
                                <div className="font-semibold text-foreground">{field.value}</div>
                              </div>
                            ))}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {metrics.map((metric) => (
                              <div key={metric.label} className="rounded-xl border border-border/40 bg-white px-3 py-2 text-xs shadow-xs dark:bg-muted/20">
                                <div className="text-muted-foreground">{metric.label}</div>
                                <div className="text-sm font-semibold text-foreground">{metric.value}</div>
                              </div>
                            ))}
                          </div>

                          {analysis.subjects.length > 0 && (
                            <div className="overflow-x-auto rounded-2xl border border-border/40 bg-white shadow-sm dark:bg-background">
                              <Table className="min-w-[360px] text-xs md:text-sm">
                                <TableHeader>
                                  <TableRow className="bg-muted/30 dark:bg-muted/40">
                                    <TableHead className="text-right">المبحث</TableHead>
                                    {analysis.terms.map((term) => (
                                      <TableHead key={`${accordionValue}-${term}`} className="text-center">
                                        {TERM_LABELS[term]}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>{renderSubjectRows(student, analysis)}</TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      )}

      {analysis && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            onClick={handleExportCertificates}
            disabled={isProcessing || isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            تصدير الشهادات
          </Button>
          <Button variant="outline" onClick={handleClear} className="border-border/60">
            إعادة التحليل لملف آخر
          </Button>
        </div>
      )}
    </div>
  );
}
