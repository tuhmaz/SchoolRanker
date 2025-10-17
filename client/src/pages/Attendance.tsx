import { useEffect, useMemo, useState } from "react";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttendanceStatus } from "@/types/attendance";

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

export default function Attendance() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);
  const [attendanceByDate, setAttendanceByDate] = useState<Record<string, { studentId: string; status: AttendanceStatus }[]>>({});

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
        if (parsed.getUTCMonth() + 1 !== selectedMonth) return [];
        return records.map((record) => ({
          studentId: record.studentId,
          date: parsed.toISOString(),
          status: record.status,
        }));
      });

      const payload = {
        school: settings.school,
        directorate: settings.directorate,
        teacherName: settings.teacherName,
        town: settings.town,
        year: settings.year,
        month: selectedMonth,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">دفتر حضور وغياب</h1>
          <p className="text-muted-foreground mt-2">تتبع حضور الطلبة بشكل يومي مع تقارير شهرية</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
                <Button
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
            variant="outline"
            onClick={handleDownload}
            disabled={!downloadInfo || isDownloading}
            data-testid="button-download-attendance"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Download className="w-4 h-4 ml-2" />}
            تحميل
          </Button>
          <Button variant="outline" onClick={handlePrint} data-testid="button-print-attendance">
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
          </div>
        </div>
      </div>

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
            <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
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
            <Label>عدد الطلبة</Label>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              {selectedStudents.length}
            </div>
          </div>

          <div className="space-y-2">
            <Label>الشهر الحالي</Label>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              {monthLabel || "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      <AttendanceCalendar
        students={selectedStudents.map((student) => ({ id: student.id, name: student.name }))}
        attendanceByDate={attendanceByDate}
        onAttendanceChange={handleAttendanceChange}
      />
    </div>
  );
}
