import { useEffect, useMemo, useState, useCallback } from "react";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Download, Loader2, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttendanceStatus } from "@/types/attendance";
import { AdSlot } from "@/components/ads/AdSlot";
import { AD_SLOTS } from "@/config/ads";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

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

type RecordsData = {
  teacherName?: string;
  directorate?: string;
  school?: string;
  town?: string;
  year?: string;
  students: Array<{ id: string; name: string; class: string; division: string }>;
  classes: Array<{ className: string; divisions: Array<{ id: string; division: string }> }>;
};

type RecordsResponse = {
  ok: true;
  record: { data: RecordsData; updatedAt: string } | null;
};

type DashboardAttendanceResponse = {
  ok: true;
  divisionId?: string;
  attendanceByDate?: Record<string, Array<{ studentId: string; status: AttendanceStatus }>>;
  updatedAt?: string | null;
};

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
  const { user } = useAuth();
  const [location] = useLocation();
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [localSettings, setLocalSettings] = useState<StoredSettings | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [exportDivisionIds, setExportDivisionIds] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);
  const [attendanceByDate, setAttendanceByDate] = useState<Record<string, { studentId: string; status: AttendanceStatus }[]>>({});
  const [attendanceByDivisionId, setAttendanceByDivisionId] = useState<
    Record<string, Record<string, { studentId: string; status: AttendanceStatus }[]>>
  >({});
  const [dirtyAttendanceByDivisionId, setDirtyAttendanceByDivisionId] = useState<Record<string, boolean>>({});
  const [showDailyPanel, setShowDailyPanel] = useState(false);
  const [termName, setTermName] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");

  const isDashboardContext = location.startsWith("/dashboard");

  const normalizeText = (value: string) => String(value ?? "").trim();

  const parseTimestamp = (value: unknown) => {
    if (!value) return 0;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getDraftKey = (divisionId: string) => `attendanceDraft:v1:${divisionId}`;

  const loadAttendanceDraft = (divisionId: string) => {
    try {
      const raw = localStorage.getItem(getDraftKey(divisionId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        updatedAt?: string;
        attendanceByDate?: Record<string, { studentId: string; status: AttendanceStatus }[]>;
      };
      if (!parsed || typeof parsed !== "object") return null;
      const attendanceByDate =
        parsed.attendanceByDate && typeof parsed.attendanceByDate === "object" ? parsed.attendanceByDate : null;
      if (!attendanceByDate) return null;
      return { updatedAt: String(parsed.updatedAt ?? ""), attendanceByDate };
    } catch {
      return null;
    }
  };

  const persistAttendanceDraft = (divisionId: string, attendance: Record<string, { studentId: string; status: AttendanceStatus }[]>) => {
    try {
      localStorage.setItem(
        getDraftKey(divisionId),
        JSON.stringify({ updatedAt: new Date().toISOString(), attendanceByDate: attendance }),
      );
    } catch {}
  };

  const clearAttendanceDraft = (divisionId: string) => {
    try {
      localStorage.removeItem(getDraftKey(divisionId));
    } catch {}
  };

  const extractYear = (value: unknown) => {
    const text = normalizeText(String(value ?? ""));
    const match = text.match(/\d{4}/);
    if (!match) return undefined;
    const year = Number(match[0]);
    return Number.isFinite(year) ? year : undefined;
  };

  const recordsQuery = useQuery<RecordsResponse>({
    queryKey: ["/api/dashboard/records"],
    queryFn: getQueryFn<RecordsResponse>({ on401: "throw" }),
    enabled: Boolean(user),
    refetchOnWindowFocus: false,
  });

  const serverSettings = useMemo<StoredSettings | null>(() => {
    const record = recordsQuery.data?.record?.data ?? null;
    if (!record) return null;
    const students: StoredStudent[] = Array.isArray(record.students)
      ? record.students.map((student) => ({
          id: String(student.id),
          name: String(student.name ?? ""),
          class: String(student.class ?? ""),
          division: String(student.division ?? ""),
        }))
      : [];
    const classes = Array.isArray(record.classes)
      ? record.classes.map((group) => ({
          className: String(group.className ?? ""),
          divisions: Array.isArray(group.divisions)
            ? group.divisions.map((div) => ({ id: String(div.id), division: String(div.division ?? "") }))
            : [],
        }))
      : [];
    return {
      teacherName: record.teacherName,
      directorate: record.directorate,
      school: record.school,
      town: record.town,
      year: record.year,
      students,
      classes,
    };
  }, [recordsQuery.data]);

  useEffect(() => {
    if (user) return;
    if (isDashboardContext) return;
    try {
      const raw = localStorage.getItem("appSettings");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSettings;
      setLocalSettings(parsed);
    } catch (error: any) {
      toast({
        title: "تعذر تحميل البيانات",
        description: error?.message || "لم نتمكن من قراءة التجهيزات المحفوظة",
        variant: "destructive",
      });
    }
  }, [isDashboardContext, toast, user]);

  const settings = serverSettings ?? (user || isDashboardContext ? null : localSettings);

  const availableDivisions = useMemo(() => {
    if (!settings?.classes) return [] as { id: string; label: string; className: string; division: string }[];
    return settings.classes.flatMap((group) => {
      const className = normalizeText(group.className);
      return group.divisions.map((div) => {
        const division = normalizeText(div.division);
        return {
          id: String(div.id),
          label: `${className || "غير محدد"} - ${division || "بدون شعبة"}`,
          className: className || "غير محدد",
          division: division || "بدون شعبة",
        };
      });
    });
  }, [settings]);

  useEffect(() => {
    if (!selectedDivisionId && availableDivisions.length > 0) {
      setSelectedDivisionId(availableDivisions[0].id);
    }
  }, [availableDivisions, selectedDivisionId]);

  useEffect(() => {
    if (!selectedDivisionId) return;
    setExportDivisionIds((prev) => {
      return prev.length === 0 ? [selectedDivisionId] : prev;
    });
  }, [selectedDivisionId]);

  useEffect(() => {
    if (!selectedDivisionId) return;
    const cached = attendanceByDivisionId[selectedDivisionId];
    setAttendanceByDate(cached ?? {});
  }, [attendanceByDivisionId, selectedDivisionId]);

  useEffect(() => {
    const divisionId = selectedDivisionId;
    if (!divisionId) return;
    if (attendanceByDivisionId[divisionId]) return;
    const draft = loadAttendanceDraft(divisionId);
    if (!draft) return;
    setAttendanceByDivisionId((prev) => {
      if (prev[divisionId]) return prev;
      return { ...prev, [divisionId]: draft.attendanceByDate };
    });
    setDirtyAttendanceByDivisionId((prev) => ({ ...prev, [divisionId]: true }));
  }, [attendanceByDivisionId, selectedDivisionId]);

  const activeDivision = useMemo(
    () => availableDivisions.find((division) => division.id === selectedDivisionId) ?? null,
    [availableDivisions, selectedDivisionId],
  );

  const selectedStudents = useMemo(() => {
    if (!settings?.students || !activeDivision) return [] as StoredStudent[];
    const className = normalizeText(activeDivision.className);
    const division = normalizeText(activeDivision.division);
    return settings.students.filter((student) => {
      return normalizeText(student.class) === className && normalizeText(student.division) === division;
    });
  }, [settings, activeDivision]);

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
    return normalizeMonths(selectedMonths.length > 0 ? selectedMonths : [currentMonth]);
  }, [currentMonth, selectedMonths]);

  const exportMonthLabels = useMemo(
    () => exportMonths.map((value) => months.find((month) => month.value === value)?.label ?? `شهر ${value}`),
    [exportMonths],
  );

  const exportMonthSet = useMemo(() => new Set(exportMonths), [exportMonths]);

  const exportMonthsSummary = exportMonthLabels.length > 0 ? exportMonthLabels.join("، ") : "—";

  const exportDivisions = useMemo(() => {
    const idSet = new Set(exportDivisionIds);
    return availableDivisions.filter((division) => idSet.has(division.id));
  }, [availableDivisions, exportDivisionIds]);

  const exportSelectionSummary = useMemo(() => {
    if (exportDivisions.length === 0) return "—";
    if (exportDivisions.length === 1) return exportDivisions[0].label;
    return `${exportDivisions.length} شُعب`;
  }, [exportDivisions]);

  const dirtyExportCount = useMemo(() => {
    const targetDivisionIds =
      exportDivisionIds.length > 0 ? exportDivisionIds : selectedDivisionId ? [selectedDivisionId] : [];
    return targetDivisionIds.filter((divisionId) => dirtyAttendanceByDivisionId[divisionId]).length;
  }, [dirtyAttendanceByDivisionId, exportDivisionIds, selectedDivisionId]);

  const editableDivisions = useMemo(
    () => (exportDivisions.length > 0 ? exportDivisions : availableDivisions),
    [availableDivisions, exportDivisions],
  );

  useEffect(() => {
    if (exportDivisionIds.length === 0) return;
    const missing = exportDivisionIds.filter((id) => !attendanceByDivisionId[id]);
    if (missing.length === 0) return;
    const loaded: Record<string, Record<string, { studentId: string; status: AttendanceStatus }[]>> = {};
    missing.forEach((divisionId) => {
      const draft = loadAttendanceDraft(divisionId);
      if (draft) {
        loaded[divisionId] = draft.attendanceByDate;
      }
    });
    if (Object.keys(loaded).length === 0) return;
    setAttendanceByDivisionId((prev) => ({ ...prev, ...loaded }));
    setDirtyAttendanceByDivisionId((prev) => {
      const next = { ...prev };
      Object.keys(loaded).forEach((divisionId) => {
        next[divisionId] = true;
      });
      return next;
    });
  }, [attendanceByDivisionId, exportDivisionIds]);

  useEffect(() => {
    if (exportDivisions.length === 0) return;
    const selectedIsExported = exportDivisions.some((division) => division.id === selectedDivisionId);
    if (!selectedIsExported) {
      setSelectedDivisionId(exportDivisions[0].id);
    }
  }, [exportDivisions, selectedDivisionId]);

  useEffect(() => {
    const divisionId = selectedDivisionId;
    if (!divisionId) return;
    if (!dirtyAttendanceByDivisionId[divisionId]) return;
    const attendance = attendanceByDivisionId[divisionId] ?? attendanceByDate;
    const handle = window.setTimeout(() => {
      persistAttendanceDraft(divisionId, attendance);
    }, 650);
    return () => window.clearTimeout(handle);
  }, [attendanceByDate, attendanceByDivisionId, dirtyAttendanceByDivisionId, selectedDivisionId]);

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
    setSelectedMonths([currentMonth]);
  };

  const isPresetActive = (presetMonths: number[]) => {
    const normalized = normalizeMonths(presetMonths);
    if (normalized.length !== exportMonths.length) return false;
    return normalized.every((value, index) => value === exportMonths[index]);
  };

  const handleAttendanceChange = (updates: Record<string, { studentId: string; status: AttendanceStatus }[]>) => {
    setAttendanceByDate((prev) => {
      const next = { ...prev };
      Object.entries(updates).forEach(([date, records]) => {
        next[date] = records.map((record) => ({
          studentId: record.studentId,
          status: record.status,
        }));
      });
      if (selectedDivisionId) {
        setAttendanceByDivisionId((prevByDivision) => ({ ...prevByDivision, [selectedDivisionId]: next }));
        setDirtyAttendanceByDivisionId((prevDirty) => ({ ...prevDirty, [selectedDivisionId]: true }));
      }
      return next;
    });
  };

  const saveAttendanceToAccount = useCallback(async () => {
    if (!user || !selectedDivisionId) return;
    try {
      setIsSaving(true);
      await apiRequest("PUT", "/api/dashboard/attendance", {
        divisionId: selectedDivisionId,
        attendanceByDate,
      });
      setAttendanceByDivisionId((prev) => ({ ...prev, [selectedDivisionId]: attendanceByDate }));
      setDirtyAttendanceByDivisionId((prev) => ({ ...prev, [selectedDivisionId]: false }));
      clearAttendanceDraft(selectedDivisionId);
      toast({
        title: "تم الحفظ على الحساب",
        description: "تمت مزامنة حضور الطلبة بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "تعذر الحفظ",
        description: String(error?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [attendanceByDate, selectedDivisionId, toast, user]);

  const saveAllAttendanceToAccount = useCallback(async () => {
    if (!user) {
      toast({
        title: "يتطلب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لحفظ الحضور على الحساب",
        variant: "destructive",
      });
      return;
    }

    const targetDivisionIds = exportDivisionIds.length > 0 ? exportDivisionIds : selectedDivisionId ? [selectedDivisionId] : [];
    const dirtyDivisionIds = targetDivisionIds.filter((divisionId) => dirtyAttendanceByDivisionId[divisionId]);
    if (dirtyDivisionIds.length === 0) {
      toast({
        title: "لا توجد تغييرات",
        description: "لا يوجد حضور جديد غير محفوظ على الحساب",
      });
      return;
    }

    try {
      setIsSaving(true);
      const results = await Promise.all(
        dirtyDivisionIds.map(async (divisionId) => {
          const attendance =
            divisionId === selectedDivisionId ? attendanceByDate : attendanceByDivisionId[divisionId] ?? {};
          const res = await apiRequest("PUT", "/api/dashboard/attendance", { divisionId, attendanceByDate: attendance });
          const data = (await res.json()) as DashboardAttendanceResponse;
          return { divisionId, attendanceByDate: data.attendanceByDate ?? {} };
        }),
      );

      setAttendanceByDivisionId((prev) => {
        const next = { ...prev };
        results.forEach((item) => {
          next[item.divisionId] = item.attendanceByDate;
        });
        return next;
      });
      setDirtyAttendanceByDivisionId((prev) => {
        const next = { ...prev };
        results.forEach((item) => {
          next[item.divisionId] = false;
          clearAttendanceDraft(item.divisionId);
        });
        return next;
      });

      toast({
        title: "تم حفظ كل الشعب",
        description: `تم حفظ ${results.length} شعبة على الحساب`,
      });
    } catch (error: any) {
      toast({
        title: "تعذر حفظ كل الشعب",
        description: String(error?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [attendanceByDate, attendanceByDivisionId, dirtyAttendanceByDivisionId, exportDivisionIds, selectedDivisionId, toast, user]);

  const handleAttendanceSaved = useCallback(() => {
    toast({
      title: "تم تطبيق التغييرات",
      description: user ? "يمكنك حفظ التغييرات على الحساب من زر الحفظ." : "تم تحديث حضور الطلبة بنجاح",
    });
  }, [toast, user]);

  const attendanceQuery = useQuery<DashboardAttendanceResponse>({
    queryKey: ["/api/dashboard/attendance", selectedDivisionId],
    enabled: Boolean(user) && Boolean(selectedDivisionId),
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/attendance?divisionId=${encodeURIComponent(selectedDivisionId)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      return (await res.json()) as DashboardAttendanceResponse;
    },
  });

  useEffect(() => {
    if (!user || !selectedDivisionId) return;
    const incoming = attendanceQuery.data?.attendanceByDate;
    if (!incoming) return;
    if (dirtyAttendanceByDivisionId[selectedDivisionId]) return;
    const draft = loadAttendanceDraft(selectedDivisionId);
    const serverUpdatedAt = attendanceQuery.data?.updatedAt ?? null;
    if (draft && parseTimestamp(draft.updatedAt) > parseTimestamp(serverUpdatedAt)) {
      setAttendanceByDivisionId((prev) => ({ ...prev, [selectedDivisionId]: draft.attendanceByDate }));
      setAttendanceByDate(draft.attendanceByDate);
      setDirtyAttendanceByDivisionId((prev) => ({ ...prev, [selectedDivisionId]: true }));
      return;
    }
    setAttendanceByDivisionId((prev) => ({ ...prev, [selectedDivisionId]: incoming }));
    setAttendanceByDate(incoming);
  }, [attendanceQuery.data, dirtyAttendanceByDivisionId, selectedDivisionId, user]);

  const handleGenerate = async () => {
    if (!settings || !selectedDivisionId) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تجهيز الصفوف والطلبة أولاً من صفحة إدارة السجلات داخل لوحة التحكم",
        variant: "destructive",
      });
      return;
    }
    const selectedExportDivisions = exportDivisions.length > 0 ? exportDivisions : activeDivision ? [activeDivision] : [];
    if (selectedExportDivisions.length === 0) {
      toast({
        title: "لم يتم اختيار شُعب للتصدير",
        description: "يرجى اختيار شعبة واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (!user && selectedExportDivisions.length > 1) {
      toast({
        title: "يتطلب تسجيل الدخول",
        description: "لتصدير أكثر من شعبة في ملف واحد، يرجى تسجيل الدخول أولاً",
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
        description:
          selectedExportDivisions.length > 1
            ? `سيتم إنشاء دفتر الحضور (${selectedExportDivisions.length} شُعب - شيت لكل شعبة)`
            : "سيتم إنشاء دفتر الحضور (شيت واحد لكل شعبة)",
      });

      const getStudentsForDivision = (division: { className: string; division: string }) => {
        if (!settings.students) return [] as StoredStudent[];
        const className = normalizeText(division.className);
        const divisionLabel = normalizeText(division.division);
        return settings.students.filter((student) => {
          return normalizeText(student.class) === className && normalizeText(student.division) === divisionLabel;
        });
      };

      const buildAttendanceRecords = (
        byDate: Record<string, { studentId: string; status: AttendanceStatus }[]>,
      ) => {
        return Object.entries(byDate).flatMap(([date, records]) => {
          const parsed = new Date(date);
          if (Number.isNaN(parsed.getTime())) return [];
          if (!exportMonthSet.has(parsed.getUTCMonth() + 1)) return [];
          return records.map((record) => ({
            studentId: record.studentId,
            date: parsed.toISOString(),
            status: record.status,
          }));
        });
      };

      const divisionAttendanceById = new Map<string, Record<string, { studentId: string; status: AttendanceStatus }[]>>();
      selectedExportDivisions.forEach((division) => {
        const divisionId = division.id;
        const cached =
          divisionId === selectedDivisionId ? attendanceByDate : attendanceByDivisionId[divisionId];
        if (cached) {
          divisionAttendanceById.set(divisionId, cached);
        }
      });

      const missingDivisionIds = selectedExportDivisions
        .map((div) => div.id)
        .filter((id) => !divisionAttendanceById.has(id));

      if (user && missingDivisionIds.length > 0) {
        const results = await Promise.all(
          missingDivisionIds.map(async (divisionId) => {
            const res = await fetch(`/api/dashboard/attendance?divisionId=${encodeURIComponent(divisionId)}`, {
              credentials: "include",
            });
            if (!res.ok) {
              const text = (await res.text()) || res.statusText;
              throw new Error(text);
            }
            const data = (await res.json()) as DashboardAttendanceResponse;
            return { divisionId, attendanceByDate: data.attendanceByDate ?? {} };
          }),
        );
        results.forEach((item) => {
          divisionAttendanceById.set(item.divisionId, item.attendanceByDate);
        });
      }

      const exportClasses = selectedExportDivisions.map((division) => ({
        id: division.id,
        name: division.label,
        sheetName: division.label,
      }));

      const exportStudents = selectedExportDivisions.flatMap((division) => {
        const students = getStudentsForDivision(division);
        return students.map((student) => ({
          id: student.id,
          fullName: student.name,
          classId: division.id,
        }));
      });

      const missingStudents = selectedExportDivisions.filter((division) => getStudentsForDivision(division).length === 0);
      if (missingStudents.length > 0) {
        toast({
          title: "بعض الشعب بلا طلبة",
          description: `لم يتم العثور على طلبة في: ${missingStudents.map((d) => d.label).join("، ")}`,
          variant: "destructive",
        });
        return;
      }

      const attendanceRecords = selectedExportDivisions.flatMap((division) => {
        const byDate = divisionAttendanceById.get(division.id) ?? {};
        return buildAttendanceRecords(byDate);
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
        classes: exportClasses,
        students: exportStudents,
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
    const divisionLabel = activeDivision?.label ?? "—";
    const periodLabel = termName ? `${termName} (${exportMonthsSummary})` : exportMonthsSummary;
    const now = new Date().toLocaleString("ar");
    const title = `تقرير الحضور والغياب - ${divisionLabel}`;

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const tableRowsHtml = perStudentStats
      .map((row) => {
        return `<tr>
<td>${escapeHtml(row.name)}</td>
<td class="num present">${escapeHtml(row.present)}</td>
<td class="num absent">${escapeHtml(row.absent)}</td>
<td class="num excused">${escapeHtml(row.excused)}</td>
<td class="num">${escapeHtml(row.percentage)}%</td>
</tr>`;
      })
      .join("");

    const summaryHtml = `<div class="summary">
<div class="card"><div class="label">أيام مسجلة</div><div class="value">${escapeHtml(stats.trackedDays)}</div></div>
<div class="card"><div class="label">حضور</div><div class="value present">${escapeHtml(stats.present)}</div></div>
<div class="card"><div class="label">غياب</div><div class="value absent">${escapeHtml(stats.absent)}</div></div>
<div class="card"><div class="label">أعذار</div><div class="value excused">${escapeHtml(stats.excused)}</div></div>
<div class="card"><div class="label">نسبة الحضور</div><div class="value primary">${escapeHtml(stats.percentage)}%</div></div>
</div>`;

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 18px; }
    .meta span { display: inline-block; margin-left: 10px; }
    .summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 14px 0 18px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; background: #f9fafb; }
    .label { color: #6b7280; font-size: 11px; margin-bottom: 6px; }
    .value { font-weight: 800; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; }
    th { background: #f3f4f6; text-align: right; }
    td.num, th.num { text-align: center; }
    .present { color: #065f46; }
    .absent { color: #991b1b; }
    .excused { color: #92400e; }
    .primary { color: #1d4ed8; }
    @media print {
      body { margin: 0; }
      .card { background: white; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <span>الشعبة: ${escapeHtml(divisionLabel)}</span>
    <span>الفترة: ${escapeHtml(periodLabel)}</span>
    <span>التاريخ: ${escapeHtml(now)}</span>
  </div>
  ${summaryHtml}
  <table>
    <thead>
      <tr>
        <th>الطالب</th>
        <th class="num">حضور</th>
        <th class="num">غياب</th>
        <th class="num">معذور</th>
        <th class="num">النسبة</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:20px;">لا توجد بيانات</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      toast({
        title: "تعذر فتح نافذة الطباعة",
        description: "يرجى السماح بالنوافذ المنبثقة ثم المحاولة مجدداً",
        variant: "destructive",
      });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  const handleDownloadCsv = () => {
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = [
      ["الطالب", "حضور", "غياب", "معذور", "النسبة"],
      ...perStudentStats.map((row) => [row.name, row.present, row.absent, row.excused, `${row.percentage}%`]),
    ];

    const csvBody = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff", csvBody], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);

    const divisionLabel = activeDivision?.label ?? "الحضور";
    const filename = `${divisionLabel.replace(/[\\/:*?"<>|]/g, "_")}_تقرير_الحضور.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const anchorYear = extractYear(settings?.year) ?? new Date().getUTCFullYear();

  const dashboardUpdatedAt = isDashboardContext ? recordsQuery.data?.record?.updatedAt ?? null : null;
  const attendanceUpdatedAt = user ? attendanceQuery.data?.updatedAt ?? null : null;

  const stats = useMemo(() => {
    const trackedDates = Object.keys(attendanceByDate).filter((key) => {
      const date = new Date(key);
      if (Number.isNaN(date.getTime())) return false;
      return exportMonthSet.has(date.getUTCMonth() + 1);
    });
    const studentIds = selectedStudents.map((student) => student.id);
    let present = 0;
    let absent = 0;
    let excused = 0;

    trackedDates.forEach((dateIso) => {
      const list = attendanceByDate[dateIso] ?? [];
      const map = new Map(list.map((entry) => [entry.studentId, entry.status] as const));
      studentIds.forEach((studentId) => {
        const status = map.get(studentId) ?? "present";
        if (status === "present") present += 1;
        else if (status === "absent") absent += 1;
        else excused += 1;
      });
    });

    const totalCells = trackedDates.length * studentIds.length;
    const effectiveCells = Math.max(0, totalCells - excused);
    const percentage = effectiveCells > 0 ? Math.round((present / effectiveCells) * 100) : 100;

    return {
      trackedDays: trackedDates.length,
      totalCells,
      present,
      absent,
      excused,
      percentage,
    };
  }, [attendanceByDate, exportMonthSet, selectedStudents]);

  const perStudentStats = useMemo(() => {
    const trackedDates = Object.keys(attendanceByDate).filter((key) => {
      const date = new Date(key);
      if (Number.isNaN(date.getTime())) return false;
      return exportMonthSet.has(date.getUTCMonth() + 1);
    });
    const list = selectedStudents.map((student) => {
      let absent = 0;
      let excused = 0;
      trackedDates.forEach((dateIso) => {
        const dayEntries = attendanceByDate[dateIso] ?? [];
        const found = dayEntries.find((entry) => entry.studentId === student.id);
        const status = found?.status ?? "present";
        if (status === "absent") absent += 1;
        else if (status === "excused") excused += 1;
      });
      const totalDays = trackedDates.length;
      const effectiveDays = Math.max(0, totalDays - excused);
      const presentDays = Math.max(0, totalDays - absent - excused);
      const percentage = effectiveDays > 0 ? Math.round((presentDays / effectiveDays) * 100) : 100;
      return { studentId: student.id, name: student.name, absent, excused, present: presentDays, totalDays, percentage };
    });

    const term = normalizeText(studentSearch).toLowerCase();
    const filtered = term
      ? list.filter((row) => normalizeText(row.name).toLowerCase().includes(term))
      : list;

    filtered.sort((a, b) => {
      if (b.absent !== a.absent) return b.absent - a.absent;
      if (b.excused !== a.excused) return b.excused - a.excused;
      return a.name.localeCompare(b.name, "ar");
    });

    return filtered;
  }, [attendanceByDate, exportMonthSet, selectedStudents, studentSearch]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8" dir="rtl">
      <section className="rounded-3xl border border-emerald-200/60 bg-gradient-to-l from-emerald-100/50 via-background to-background px-5 py-6 shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/40 dark:via-background/40 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-100/60 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-900/40 dark:text-emerald-200">
              تتبع الحضور بسهولة
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">دفتر حضور وغياب</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">تعرّف على حالة الطلبة شهرياً وحدد الفترة التي تعمل عليها الآن.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="rounded-full border border-emerald-400/50 bg-emerald-50/70 px-3 py-1 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-900/30 dark:text-emerald-200">
                الشعبة الحالية: {activeDivision?.label ?? "غير محددة"}
              </span>
              <span className="rounded-full border border-sky-400/50 bg-sky-50/70 px-3 py-1 text-sky-800 dark:border-sky-500/40 dark:bg-sky-900/30 dark:text-sky-200">
                الأشهر المختارة: {exportMonthsSummary}
              </span>
              {termName ? (
                <span className="rounded-full border border-amber-400/60 bg-amber-50/70 px-3 py-1 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-200">
                  الفترة: {termName}
                </span>
              ) : null}
              {isDashboardContext && dashboardUpdatedAt ? (
                <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-muted-foreground">
                  آخر تحديث للبيانات: {new Date(dashboardUpdatedAt).toLocaleString("ar")}
                </span>
              ) : null}
              {user && attendanceUpdatedAt ? (
                <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-muted-foreground">
                  آخر مزامنة للحضور: {new Date(attendanceUpdatedAt).toLocaleString("ar")}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
              {isDashboardContext ? (
                <Button variant="secondary" asChild className="w-full gap-2 sm:w-auto">
                  <Link href="/dashboard">
                    <ArrowRight className="ml-2 h-4 w-4" />
                    العودة للوحة التحكم
                  </Link>
                </Button>
              ) : null}
              <Button
                className="w-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 focus-visible:ring-emerald-600/60 sm:w-auto"
                onClick={handleGenerate}
                disabled={isGenerating}
                data-testid="button-generate-attendance"
              >
                {isGenerating ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="ml-2 h-4 w-4" />
                )}
                إنشاء الملف
              </Button>
              <Button
                className="w-full border-emerald-500/40 text-emerald-700 transition-colors hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-900/40 sm:w-auto"
                variant="outline"
                onClick={handleDownload}
                disabled={!downloadInfo || isDownloading}
                data-testid="button-download-attendance"
              >
                {isDownloading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="ml-2 h-4 w-4" />
                )}
                تحميل
              </Button>
              <Button
                className="w-full border-amber-400/60 text-amber-700 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-900/40 sm:w-auto"
                variant="outline"
                onClick={handlePrint}
                data-testid="button-print-attendance"
              >
                <Printer className="ml-2 h-4 w-4" />
                طباعة
              </Button>
              <Button
                className="w-full border-sky-400/60 text-sky-700 hover:border-sky-500 hover:bg-sky-50 hover:text-sky-800 dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-sky-900/40 sm:w-auto"
                variant="outline"
                onClick={handleDownloadCsv}
                data-testid="button-download-attendance-csv"
              >
                <Download className="ml-2 h-4 w-4" />
                تقرير CSV
              </Button>
              {user ? (
                <>
                  <Button
                    className="w-full border-primary/40 text-primary hover:border-primary hover:bg-primary/10 sm:w-auto"
                    variant="outline"
                    onClick={saveAttendanceToAccount}
                    disabled={isSaving || !selectedDivisionId || !dirtyAttendanceByDivisionId[selectedDivisionId]}
                    data-testid="button-save-attendance"
                  >
                    {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                    حفظ الشعبة
                  </Button>
                  <Button
                    className="w-full border-primary/40 text-primary hover:border-primary hover:bg-primary/10 sm:w-auto"
                    variant="outline"
                    onClick={saveAllAttendanceToAccount}
                    disabled={isSaving || dirtyExportCount === 0 || exportDivisionIds.length <= 1}
                    data-testid="button-save-attendance-all"
                  >
                    {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                    حفظ كل الشعب
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {!isDashboardContext ? (
        <>
          <Card>
            <CardHeader>
          <CardTitle>تعليمات إنشاء دفتر الحضور</CardTitle>
          <CardDescription>يتم دمج كل الأشهر المحددة في شيت واحد لكل صف وشعبة.</CardDescription>
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
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>اختيار البيانات</CardTitle>
          <CardDescription>اختر الشعبة وحدد الأشهر المراد تصديرها إلى ملف Excel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="select-division" className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
              الصف والشعبة
            </Label>
            <Select
              value={selectedDivisionId}
              onValueChange={(value) => {
                setSelectedDivisionId(value);
              }}
            >
              <SelectTrigger
                id="select-division"
                data-testid="select-division"
                className="border-emerald-200/60 bg-emerald-50/70 text-emerald-900 shadow-sm transition-colors hover:border-emerald-300 focus-visible:ring-emerald-500/40 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100"
              >
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

          <div className="space-y-2 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">الشُعب المراد تصديرها</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExportDivisionIds(availableDivisions.map((division) => division.id))}
                >
                  تحديد الكل
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setExportDivisionIds([])}>
                  إلغاء الكل
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => (selectedDivisionId ? setExportDivisionIds([selectedDivisionId]) : null)}
                >
                  الشعبة الحالية فقط
                </Button>
              </div>
            </div>
            <div
              className="grid gap-2 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="export-division-grid"
            >
              {availableDivisions.map((division) => {
                const checked = exportDivisionIds.includes(division.id);
                return (
                  <label
                    key={division.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors",
                      checked && "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(nextChecked) => {
                        const desired = Boolean(nextChecked);
                        setExportDivisionIds((prev) => {
                          const exists = prev.includes(division.id);
                          if (desired && !exists) return [...prev, division.id];
                          if (!desired && exists) return prev.filter((id) => id !== division.id);
                          return prev;
                        });
                      }}
                    />
                    <span className="truncate">{division.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">سيتم إنشاء شيت مستقل لكل شعبة محددة. {exportSelectionSummary}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">عدد الطلبة</p>
            <div className="rounded-md border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-900/30 dark:text-emerald-100" aria-live="polite">
              {selectedStudents.length}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-200">ملخص الأشهر المختارة</p>
            <div className="rounded-md border border-sky-200/60 bg-sky-50/60 px-3 py-2 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-900/30 dark:text-sky-100" aria-live="polite">
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
              className="border-emerald-200/60 focus-visible:ring-emerald-500/40 dark:border-emerald-500/30"
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
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMonthSelection(month.value)}
                    className={cn(
                      "border-dashed border-slate-300/60 text-muted-foreground transition-colors hover:border-emerald-400/70 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-slate-600/60 dark:hover:bg-emerald-900/30",
                      isActive &&
                        "border-emerald-500 bg-emerald-100/80 text-emerald-900 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-900/50 dark:text-emerald-100",
                    )}
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
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePresetSelection(preset.months, preset.label)}
                  className={cn(
                    "border border-transparent text-muted-foreground hover:border-emerald-400 hover:bg-emerald-50/70 hover:text-emerald-800 dark:hover:bg-emerald-900/30",
                    isPresetActive(preset.months) &&
                      "border-emerald-500/60 bg-emerald-100/80 text-emerald-900 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-900/50 dark:text-emerald-100",
                  )}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllMonths}
                className="text-sky-700 hover:bg-sky-50/60 hover:text-sky-900 dark:text-sky-200 dark:hover:bg-sky-900/30"
              >
                تحديد كل الأشهر
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearMonths}
                className="text-rose-700 hover:bg-rose-50/60 hover:text-rose-900 dark:text-rose-200 dark:hover:bg-rose-900/30"
              >
                مسح التحديد
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>ملخص وتقارير</CardTitle>
            <CardDescription>
              يغطي الإحصائيات الأشهر المحددة ({exportMonthsSummary}). الأيام غير المسجلة لا تُحتسب.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="بحث عن طالب..."
              className="sm:w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">أيام مسجلة</div>
              <div className="text-2xl font-bold">{stats.trackedDays}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-chart-1/10 p-4">
              <div className="text-xs text-muted-foreground">حضور</div>
              <div className="text-2xl font-bold text-chart-1">{stats.present}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-destructive/10 p-4">
              <div className="text-xs text-muted-foreground">غياب</div>
              <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-amber-500/10 p-4">
              <div className="text-xs text-muted-foreground">أعذار</div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-200">{stats.excused}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-primary/10 p-4">
              <div className="text-xs text-muted-foreground">نسبة الحضور</div>
              <div className="text-2xl font-bold text-primary">{stats.percentage}%</div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="sticky top-0 bg-muted/40 px-3 py-2 text-right font-semibold">الطالب</th>
                    <th className="sticky top-0 bg-muted/40 px-3 py-2 text-center font-semibold">حضور</th>
                    <th className="sticky top-0 bg-muted/40 px-3 py-2 text-center font-semibold">غياب</th>
                    <th className="sticky top-0 bg-muted/40 px-3 py-2 text-center font-semibold">معذور</th>
                    <th className="sticky top-0 bg-muted/40 px-3 py-2 text-center font-semibold">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {perStudentStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        {selectedStudents.length === 0 ? "اختر شعبة لعرض التقارير." : "لا توجد بيانات مطابقة."}
                      </td>
                    </tr>
                  ) : (
                    perStudentStats.map((row) => (
                      <tr key={row.studentId} className="border-t border-border/60">
                        <td className="px-3 py-2 text-right font-medium">{row.name}</td>
                        <td className="px-3 py-2 text-center text-chart-1 font-semibold">{row.present}</td>
                        <td className="px-3 py-2 text-center text-destructive font-semibold">{row.absent}</td>
                        <td className="px-3 py-2 text-center text-amber-700 dark:text-amber-200 font-semibold">{row.excused}</td>
                        <td className="px-3 py-2 text-center font-semibold">{row.percentage}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
            <div className="w-full space-y-1 sm:w-72">
              <Label className="text-xs text-muted-foreground">تعديل شعبة</Label>
              <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الشعبة" />
                </SelectTrigger>
                <SelectContent>
                  {editableDivisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDivisionId && dirtyAttendanceByDivisionId[selectedDivisionId] ? (
                <div className="text-xs font-medium text-amber-700 dark:text-amber-200">تغييرات غير محفوظة</div>
              ) : null}
            </div>

            <span className="text-sm font-medium text-foreground">العرض اليومي</span>
            <Button
              id="toggle-daily"
              variant="outline"
              size="sm"
              onClick={() => setShowDailyPanel((prev) => !prev)}
              className={cn(
                "w-full border-emerald-400/50 text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40 sm:w-auto",
                showDailyPanel && "border-emerald-600 bg-emerald-100/80 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-900/40 dark:text-emerald-100",
              )}
            >
              {showDailyPanel ? "إخفاء اللوحة اليومية" : "عرض اللوحة اليومية"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {user && selectedDivisionId && !attendanceByDivisionId[selectedDivisionId] && attendanceQuery.isFetching ? (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري تحميل بيانات الشعبة...
            </div>
          ) : (
            <AttendanceCalendar
              students={selectedStudents.map((student) => ({ id: student.id, name: student.name }))}
              attendanceByDate={attendanceByDate}
              onAttendanceChange={handleAttendanceChange}
              onChangesSaved={handleAttendanceSaved}
              disableDailyView={!showDailyPanel}
              anchorMonth={exportMonths[0] ?? currentMonth}
              anchorYear={anchorYear}
              allowedMonths={exportMonths}
            />
          )}
        </CardContent>
      </Card>

      {!isDashboardContext ? <AdSlot slot={AD_SLOTS.footer} className="mx-auto w-full max-w-4xl" format="horizontal" skeleton /> : null}
    </div>
  );
}
