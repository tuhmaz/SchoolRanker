import { useEffect, useMemo, useState, useCallback } from "react";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttendanceStatus } from "@/types/attendance";
import { AdSlot } from "@/components/ads/AdSlot";
import { AD_SLOTS } from "@/config/ads";

interface StoredStudent {
  id: string;
  name: string;
  class: string;
  division: string;
}

interface StoredSettings {
  teacherName?: string;
  directorate?: string;
  school?: string;
  town?: string;
  year?: string;
  classes?: {
    className: string;
    divisions: { id: string; division: string }[];
  }[];
  students?: StoredStudent[];
}

const months = [
  { value: 1, label: "كانون الثاني" },
  { value: 2, label: "شباط" },
  { value: 3, label: "آذار" },
  { value: 4, label: "نيسان" },
  { value: 5, label: "أيار" },
  { value: 6, label: "حزيران" },
  { value: 7, label: "تموز" },
  { value: 8, label: "آب" },
  { value: 9, label: "أيلول" },
  { value: 10, label: "تشرين الأول" },
  { value: 11, label: "تشرين الثاني" },
  { value: 12, label: "كانون الأول" },
];

const termPresets: { id: string; label: string; months: number[] }[] = [
  { id: "term-1", label: "الفصل الأول", months: [9, 10, 11, 12, 1] },
  { id: "term-2", label: "الفصل الثاني", months: [2, 3, 4, 5, 6] },
  { id: "full-year", label: "السنة كاملة", months: months.map((month) => month.value) },
];

export default function Attendance() {
  const { toast } = useToast();
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);
  const [attendanceByDate, setAttendanceByDate] = useState<Record<string, { studentId: string; status: AttendanceStatus }[]>>({});
  const [showDailyPanel, setShowDailyPanel] = useState(false);
  const [termName, setTermName] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("appSettings");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSettings;
      setSettings(parsed);
      if (!selectedDivisionId && Array.isArray(parsed.classes)) {
        const firstDivision = parsed.classes.flatMap((c) => c.divisions)[0];
        if (firstDivision?.id) {
          setSelectedDivisionId(firstDivision.id);
        }
      }
    } catch (error: any) {
      toast({
        title: "تعذر تحميل البيانات",
        description: error?.message || "لم نتمكن من قراءة التجهيزات المحفوظة",
        variant: "destructive",
      });
    }
  }, [toast, selectedDivisionId]);

  const availableDivisions = useMemo(() => {
    if (!settings?.classes) return [] as { id: string; label: string; className: string; division: string }[];
    return settings.classes.flatMap((group) =>
      group.divisions.map((div) => ({
        id: div.id,
        label: `${group.className} - ${div.division}`,
        className: group.className,
        division: div.division,
      })),
    );
  }, [settings]);

  useEffect(() => {
    if (!selectedDivisionId && availableDivisions.length > 0) {
      setSelectedDivisionId(availableDivisions[0].id);
    }
  }, [availableDivisions, selectedDivisionId]);

  const selectedStudents = useMemo(() => {
    if (!settings?.students || !selectedDivisionId) return [] as StoredStudent[];
    return settings.students.filter((student) => `${student.class}-${student.division}` === selectedDivisionId);
  }, [settings, selectedDivisionId]);

  const normalizeMonths = (values: number[]) => {
    const seen = new Set<number>();
    const result: number[] = [];
    values.forEach((value) => {
      if (value >= 1 && value <= 12 && !seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    });
    return result;
  };

  const exportMonths = useMemo(() => {
    return normalizeMonths(selectedMonths.length > 0 ? selectedMonths : [selectedMonth]);
  }, [selectedMonths, selectedMonth]);

  const exportMonthLabels = useMemo(
    () => exportMonths.map((value) => months.find((month) => month.value === value)?.label ?? `شهر ${value}`),
    [exportMonths],
  );

  const exportMonthSet = useMemo(() => new Set(exportMonths), [exportMonths]);

  const exportMonthsSummary = exportMonthLabels.length > 0 ? exportMonthLabels.join("، ") : "—";

  const toggleMonthSelection = (value: number) => {
    setSelectedMonths((prev) => {
      const exists = prev.includes(value);
      const next = exists ? prev.filter((month) => month !== value) : [...prev, value];
      return normalizeMonths(next);
    });
  };

  const applyPreset = (presetMonths: number[], presetLabel?: string) => {
    const normalized = normalizeMonths(presetMonths);
    setSelectedMonths(normalized);
    if (presetLabel) {
      setTermName(presetLabel);
    }
  };

  const handlePresetSelection = (presetMonths: number[], label: string) => {
    applyPreset(presetMonths, label);
  };

  const handleSelectAllMonths = () => {
    applyPreset(months.map((month) => month.value));
  };

  const handleClearMonths = () => {
    setSelectedMonths([]);
  };

  const isPresetActive = (presetMonths: number[]) => {
    const normalized = normalizeMonths(presetMonths);
    if (normalized.length !== exportMonths.length) return false;
    return normalized.every((value, index) => value === exportMonths[index]);
  };

  const handleAttendanceChange = (updates: Record<string, { studentId: string; present: boolean }[]>) => {
    setAttendanceByDate((prev) => {
      const next = { ...prev };
      Object.entries(updates).forEach(([date, records]) => {
        next[date] = records.map((record) => ({
          studentId: record.studentId,
          status: record.present ? "present" : "absent",
        }));
      });
      return next;
    });
  };

  const handleAttendanceSaved = useCallback(() => {
    toast({
      title: "تم حفظ التغييرات",
      description: "تم تحديث حضور الطلبة بنجاح",
    });
  }, [toast]);

  const handleGenerate = async () => {
    if (!settings || !selectedDivisionId) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تجهيز الصفوف والطلبة أولاً من صفحة التجهيزات",
        variant: "destructive",
      });
      return;
    }
    const divisionInfo = availableDivisions.find((div) => div.id === selectedDivisionId);
    if (!divisionInfo) {
      toast({
        title: "لم يتم العثور على الشعبة",
        description: "يرجى اختيار صف وشعبة صحيحة",
        variant: "destructive",
      });
      return;
    }
    if (selectedStudents.length === 0) {
      toast({
        title: "لا يوجد طلبة",
        description: "لم يتم العثور على طلبة تابعين لهذه الشعبة",
        variant: "destructive",
      });
      return;
    }

    if (exportMonths.length === 0) {
      toast({
        title: "لم يتم اختيار الأشهر",
        description: "يرجى اختيار صف وشعبة لكل حصة قبل التصدير",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setDownloadInfo(null);
      toast({
        title: "جاري المعالجة",
        description: "سيتم إنشاء دفتر الحضور",
      });

      const attendanceRecords = Object.entries(attendanceByDate).flatMap(([date, records]) => {
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return [];
        if (!exportMonthSet.has(parsed.getUTCMonth() + 1)) return [];
        return records.map((record) => ({
          studentId: record.studentId,
          date: parsed.toISOString(),
          status: record.status,
        }));
      });

      const trimmedTermName = termName.trim();
      const payload = {
        school: settings.school,
        directorate: settings.directorate,
        teacherName: settings.teacherName,
        town: settings.town,
        year: settings.year,
        month: exportMonths[0],
        months: exportMonths,
        termName: trimmedTermName || undefined,
        classes: [
          {
            id: divisionInfo.id,
            name: divisionInfo.label,
            sheetName: divisionInfo.label,
          },
        ],
        students: selectedStudents.map((student) => ({
          id: student.id,
          fullName: student.name,
          classId: divisionInfo.id,
        })),
        attendance: attendanceRecords,
      };

      const response = await fetch("/api/export/attendance", {
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
        description: data.filename ? `تم تجهيز الملف: ${data.filename}` : "يمكنك تنزيل دفتر الحضور الآن",
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
        description: "يرجى إنشاء دفتر الحضور أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      const response = await fetch(`/api/export/attendance?id=${encodeURIComponent(downloadInfo.id)}`);
      if (!response.ok) {
        throw new Error("فشل تحميل الملف");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadInfo.filename || "دفتر_الحضور.xlsx";
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

  const handlePrint = () => {
    toast({
      title: "جاري الطباعة",
      description: "سيتم فتح نافذة الطباعة",
    });
  };

  const monthLabel = months.find((option) => option.value === selectedMonth)?.label ?? "";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">دفتر حضور وغياب</h1>
          <p className="text-muted-foreground mt-2">تتبع حضور الطلبة بشكل يومي مع تقارير شهرية</p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={handleGenerate}
              disabled={isGenerating}
              data-testid="button-generate-attendance"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 ml-2" />
              )}
              إنشاء الملف
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={handleDownload}
              disabled={!downloadInfo || isDownloading}
              data-testid="button-download-attendance"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 ml-2" />
              )}
              تحميل
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={handlePrint}
              data-testid="button-print-attendance"
            >
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تعليمات إنشاء دفتر الحضور</CardTitle>
          <CardDescription>اتبع الخطوات التالية لإنتاج دفتر فصل كامل أو السنة الدراسية بسهولة.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="overview">
            <AccordionItem value="overview">
              <AccordionTrigger className="text-right">١. اختيار الشعبة والفصل</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm leading-7 text-muted-foreground">
                <p>
                  ابدأ باختيار <strong>الصف والشعبة</strong> من القائمة العلوية، ثم فعّل أحد الأزرار الجاهزة للفصل الأول، الفصل
                  الثاني أو السنة كاملة. سيتم تفعيل الأشهر الخاصة بالفصل المختار فقط، ويمكنك تعديل التحديد يدويًا عند الحاجة.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tracking">
              <AccordionTrigger className="text-right">٢. تعبئة الحضور والغياب</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm leading-7 text-muted-foreground">
                <p>
                  استخدم لوحة <strong>سجل الحضور</strong> لضبط حالة الطلبة في الشهر الحالي، مع إمكانية تفعيل العرض اليومي للتعامل
                  مع كل يوم على حدة. بعد التعديل اضغط زر <strong>حفظ التغييرات</strong> لإظهار إشعار النجاح.
                </p>
                <p>
                  تجول بين الأشهر باستخدام الأسهم داخل التقويم، وستبقى الحركة محصورة ضمن الأشهر التي فعّلتها للفصل المختار.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="export">
              <AccordionTrigger className="text-right">٣. التصدير والمراجعة</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm leading-7 text-muted-foreground">
                <p>
                  بعد الانتهاء من مراجعة أشهر الفصل، اضغط <strong>إنشاء الملف</strong> لبدء توليد الدفتر. عند اكتمال العملية ستظهر
                  رسالة تأكيد مع إمكانية تنزيل الملف مباشرة عبر زر <strong>تحميل</strong>.
                </p>
                <p>
                  كرر العملية للفصل الآخر إذا رغبت بإنتاج دفتر منفصل، أو فعّل كل الأشهر لتجهيز نسخة تغطي السنة الدراسية بأكملها.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <AdSlot slot={AD_SLOTS.contentInline} className="mx-auto w-full max-w-4xl" skeleton />

      <Card>
        <CardHeader>
          <CardTitle>اختيار البيانات</CardTitle>
          <CardDescription>اختر الشعبة والشهر المراد تصديره إلى ملف Excel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="select-division">الصف والشعبة</Label>
            <Select
              value={selectedDivisionId}
              onValueChange={(value) => {
                setSelectedDivisionId(value);
                setAttendanceByDate({});
              }}
            >
              <SelectTrigger id="select-division" data-testid="select-division">
                <SelectValue placeholder="اختر الشعبة" />
              </SelectTrigger>
              <SelectContent>
                {availableDivisions.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="select-month">الشهر</Label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) => {
                const numeric = Number(value);
                setSelectedMonth(numeric);
                if (selectedMonths.length <= 1) {
                  setSelectedMonths([numeric]);
                }
              }}
            >
              <SelectTrigger id="select-month" data-testid="select-month">
                <SelectValue placeholder="اختر الشهر" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">عدد الطلبة</p>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm" aria-live="polite">
              {selectedStudents.length}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">ملخص الأشهر المختارة</p>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm" aria-live="polite">
              {exportMonthsSummary}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="term-name">عنوان الفترة (اختياري)</Label>
            <Input
              id="term-name"
              value={termName}
              onChange={(event) => setTermName(event.target.value)}
              placeholder="مثال: الفصل الأول"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium text-foreground" id="export-months-label">
              الأشهر المطلوب تصديرها
            </p>
            <div className="flex flex-wrap gap-2">
              {months.map((month) => {
                const isActive = exportMonthSet.has(month.value);
                return (
                  <Button
                    key={month.value}
                    variant={isActive ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleMonthSelection(month.value)}
                  >
                    {month.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {termPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={isPresetActive(preset.months) ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handlePresetSelection(preset.months, preset.label)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={handleSelectAllMonths}>
                تحديد كل الأشهر
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearMonths}>
                مسح التحديد
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>سجل الحضور</CardTitle>
            <CardDescription>
              اختر نطاق المتابعة واضبط حضور الطلبة. يمكنك تفعيل العرض اليومي حسب الحاجة.
            </CardDescription>
          </div>
          <div className="flex flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-medium text-foreground">العرض اليومي</span>
            <Button
              id="toggle-daily"
              variant={showDailyPanel ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowDailyPanel((prev) => !prev)}
              className="w-full sm:w-auto"
            >
              {showDailyPanel ? "إخفاء اللوحة اليومية" : "عرض اللوحة اليومية"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AttendanceCalendar
            students={selectedStudents.map((student) => ({ id: student.id, name: student.name }))}
            attendanceByDate={attendanceByDate}
            onAttendanceChange={handleAttendanceChange}
            onChangesSaved={handleAttendanceSaved}
            disableDailyView={!showDailyPanel}
            anchorMonth={selectedMonth}
            anchorYear={settings?.year ? Number(settings.year) : undefined}
            allowedMonths={exportMonths}
          />
        </CardContent>
      </Card>

      <AdSlot slot={AD_SLOTS.footer} className="mx-auto w-full max-w-4xl" format="horizontal" skeleton />
    </div>
  );
}
