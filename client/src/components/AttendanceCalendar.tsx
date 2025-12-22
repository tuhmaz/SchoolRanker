import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AttendanceStatus } from "@/types/attendance";
import { Users } from "lucide-react";

type Mode = "daily" | "weekly" | "monthly";

type AttendanceMatrix = Record<string, Record<string, AttendanceStatus>>;

interface AttendanceCalendarProps {
  students: { id: string; name: string }[];
  attendanceByDate?: Record<string, { studentId: string; status: AttendanceStatus }[]>;
  onAttendanceChange?: (updates: Record<string, { studentId: string; status: AttendanceStatus }[]>) => void;
  disableDailyView?: boolean;
  onChangesSaved?: () => void;
  anchorMonth?: number;
  anchorYear?: number;
  allowedMonths?: number[];
}

const weekdayLabels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const weekdayOrder = [0, 1, 2, 3, 4];

const columnHeaderClasses = [
  "bg-primary/20 text-primary",
  "bg-chart-1/20 text-chart-1",
  "bg-secondary/30 text-secondary-foreground",
  "bg-accent/20 text-accent-foreground",
  "bg-muted/50 text-muted-foreground",
];

const columnCellClasses = [
  "bg-primary/10",
  "bg-chart-1/10",
  "bg-secondary/10",
  "bg-accent/10",
  "bg-muted/20",
];

const weekAccentPalette = [
  { header: "bg-primary/10 text-primary", border: "border-primary/40" },
  { header: "bg-chart-1/10 text-chart-1", border: "border-chart-1/40" },
  { header: "bg-amber-100 text-amber-900", border: "border-amber-300" },
  { header: "bg-sky-100 text-sky-900", border: "border-sky-300" },
];

const arabicMonthNames: Record<number, string> = {
  1: "كانون الثاني",
  2: "شباط",
  3: "آذار",
  4: "نيسان",
  5: "أيار",
  6: "حزيران",
  7: "تموز",
  8: "آب",
  9: "أيلول",
  10: "تشرين الأول",
  11: "تشرين الثاني",
  12: "كانون الأول",
};

const formatArabicDate = (date: Date, includeYear = true) => {
  const day = date.getUTCDate();
  const month = arabicMonthNames[date.getUTCMonth() + 1];
  const year = date.getUTCFullYear();
  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
};

const formatIso = (date: Date) => {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.toISOString();
};

const startOfWeek = (date: Date) => {
  const clone = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = clone.getUTCDay();
  clone.setUTCDate(clone.getUTCDate() - day);
  return clone;
};

const getTeachingDaysOfMonth = (anchor: Date) => {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const result: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day));
    if (weekdayOrder.includes(date.getUTCDay())) {
      result.push(date);
    }
  }
  return result;
};

const buildMonthlyWeeks = (days: Date[]) => {
  const weekMap = new Map<string, (Date | null)[]>();
  days.forEach((date) => {
    const weekStart = startOfWeek(date);
    const key = weekStart.toISOString();
    if (!weekMap.has(key)) {
      weekMap.set(key, [null, null, null, null, null]);
    }
    const bucket = weekMap.get(key)!;
    bucket[date.getUTCDay()] = date;
  });
  return Array.from(weekMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([, value]) => value);
};

export function AttendanceCalendar({
  students,
  attendanceByDate,
  onAttendanceChange,
  disableDailyView = false,
  onChangesSaved,
  anchorMonth,
  anchorYear,
  allowedMonths,
}: AttendanceCalendarProps) {
  const availableModes: Mode[] = disableDailyView ? ["weekly", "monthly"] : ["daily", "weekly", "monthly"];
  const initialMode: Mode = disableDailyView ? "weekly" : "daily";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [anchorDate, setAnchorDate] = useState(() => {
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    return base;
  });
  const [matrix, setMatrix] = useState<AttendanceMatrix>({});
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});
  const [weeklyCollapsed, setWeeklyCollapsed] = useState<Record<string, boolean>>({});

  const allowedMonthList = useMemo(() => {
    if (!allowedMonths || allowedMonths.length === 0) return undefined;
    const seen = new Set<number>();
    const list: number[] = [];
    allowedMonths.forEach((month) => {
      if (month >= 1 && month <= 12 && !seen.has(month)) {
        seen.add(month);
        list.push(month);
      }
    });
    return list.length > 0 ? list : undefined;
  }, [allowedMonths]);

  const allowedMonthSequence = useMemo(() => {
    if (!allowedMonthList || allowedMonthList.length === 0) return undefined;
    let offset = 0;
    let previous = allowedMonthList[0];
    return allowedMonthList.map((month, index) => {
      if (index > 0) {
        if (month < previous) {
          offset += 1;
        }
        previous = month;
      }
      return { month, offset, index } as const;
    });
  }, [allowedMonthList]);

  const allowedMonthInfo = useMemo(() => {
    if (!allowedMonthSequence) return undefined;
    const map = new Map<number, { index: number; offset: number }>();
    allowedMonthSequence.forEach(({ month, offset, index }) => {
      if (!map.has(month)) {
        map.set(month, { index, offset });
      }
    });
    return map;
  }, [allowedMonthSequence]);

  const baseYearRef = useRef<number>(anchorYear && !Number.isNaN(anchorYear) ? anchorYear : anchorDate.getUTCFullYear());

  useEffect(() => {
    if (disableDailyView && mode === "daily") {
      setMode("weekly");
    }
  }, [disableDailyView, mode]);

  useEffect(() => {
    if (allowedMonthSequence && allowedMonthSequence.length > 0) {
      const currentInfo = allowedMonthInfo?.get(anchorDate.getUTCMonth() + 1);
      if (currentInfo) {
        baseYearRef.current = anchorDate.getUTCFullYear() - currentInfo.offset;
      } else if (anchorYear && !Number.isNaN(anchorYear)) {
        baseYearRef.current = anchorYear;
      }
    } else if (anchorYear && !Number.isNaN(anchorYear)) {
      baseYearRef.current = anchorYear;
    }
  }, [allowedMonthSequence, allowedMonthInfo, anchorDate, anchorYear]);

  const lastSyncedAnchor = useRef<{ month?: number; year?: number }>({
    month: anchorMonth,
    year: anchorYear,
  });

  const anchorKey = useMemo(
    () => `${anchorDate.getUTCFullYear()}-${anchorDate.getUTCMonth()}`,
    [anchorDate],
  );

  useEffect(() => {
    setCollapsedWeeks({});
  }, [anchorKey]);

  const selectedDates = useMemo(() => {
    if (!disableDailyView && mode === "daily") {
      return [new Date(anchorDate)];
    }

    if (mode === "weekly") {
      const start = startOfWeek(anchorDate);
      return Array.from({ length: 5 }, (_, idx) =>
        new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + idx)),
      );
    }

    return getTeachingDaysOfMonth(anchorDate);
  }, [mode, anchorDate]);

  useEffect(() => {
    if (mode !== "weekly") return;
    setWeeklyCollapsed((prev) => {
      const next: Record<string, boolean> = {};
      selectedDates.forEach((date) => {
        const iso = formatIso(date);
        next[iso] = prev[iso] ?? true;
      });
      return next;
    });
  }, [mode, selectedDates]);

  const selectedDateIsos = useMemo(() => selectedDates.map(formatIso), [selectedDates]);

  useEffect(() => {
    setMatrix((prev) => {
      const next: AttendanceMatrix = {};
      students.forEach((student) => {
        const prevRow = prev[student.id] ?? {};
        const row: Record<string, AttendanceStatus> = {};
        selectedDateIsos.forEach((dateIso) => {
          const existingEntry = attendanceByDate?.[dateIso]?.find((record) => record.studentId === student.id);
          if (existingEntry) {
            row[dateIso] = existingEntry.status;
          } else if (prevRow[dateIso] !== undefined) {
            row[dateIso] = prevRow[dateIso];
          } else {
            row[dateIso] = "present";
          }
        });
        next[student.id] = row;
      });
      return next;
    });
  }, [students, attendanceByDate, selectedDateIsos]);

  const emitChange = useCallback(
    (next: AttendanceMatrix) => {
      if (!onAttendanceChange) return;
      const updates: Record<string, { studentId: string; status: AttendanceStatus }[]> = {};
      selectedDateIsos.forEach((dateIso) => {
        updates[dateIso] = students.map((student) => ({
          studentId: student.id,
          status: next[student.id]?.[dateIso] ?? "present",
        }));
      });
      onAttendanceChange(updates);
    },
    [onAttendanceChange, selectedDateIsos, students],
  );

  const updateMatrix = useCallback(
    (updater: (prev: AttendanceMatrix) => AttendanceMatrix) => {
      setMatrix((prev) => {
        const next = updater(prev);
        if (!disableDailyView && mode === "daily") {
          emitChange(next);
        }
        return next;
      });
    },
    [emitChange, mode, disableDailyView],
  );

  const handleApplyChanges = () => {
    emitChange(matrix);
    onChangesSaved?.();
  };

  const cycleStatus = (current: AttendanceStatus) => {
    if (current === "present") return "absent";
    if (current === "absent") return "excused";
    return "present";
  };

  const toggleCell = (studentId: string, dateIso: string) => {
    updateMatrix((prev) => {
      const next = { ...prev };
      const row = { ...(next[studentId] ?? {}) };
      const current = row[dateIso] ?? "present";
      row[dateIso] = cycleStatus(current);
      next[studentId] = row;
      return next;
    });
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    updateMatrix((prev) => {
      const next = { ...prev };
      students.forEach((student) => {
        const row = { ...(next[student.id] ?? {}) };
        selectedDateIsos.forEach((dateIso) => {
          row[dateIso] = status;
        });
        next[student.id] = row;
      });
      return next;
    });
  };

  const navigate = (direction: 1 | -1) => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      next.setUTCHours(0, 0, 0, 0);

      if (mode === "daily") {
        next.setUTCDate(next.getUTCDate() + direction);
      } else if (mode === "weekly") {
        next.setUTCDate(next.getUTCDate() + direction * 7);
      } else {
        next.setUTCMonth(next.getUTCMonth() + direction);
        next.setUTCDate(1);
      }

      if (!allowedMonthSequence || allowedMonthSequence.length === 0 || !allowedMonthInfo) {
        return next;
      }

      const finalize = (targetMonth: number, targetOffset: number) => {
        const year = baseYearRef.current + targetOffset;
        const date = new Date(Date.UTC(year, targetMonth - 1, 1));
        date.setUTCHours(0, 0, 0, 0);
        return date;
      };

      const candidateMonth = next.getUTCMonth() + 1;
      const candidateInfo = allowedMonthInfo.get(candidateMonth);
      if (candidateInfo) {
        return finalize(candidateMonth, candidateInfo.offset);
      }

      const prevMonth = prev.getUTCMonth() + 1;
      const prevInfo = allowedMonthInfo.get(prevMonth);
      if (!prevInfo) {
        const first = allowedMonthSequence[0];
        return finalize(first.month, first.offset);
      }

      let targetIndex = prevInfo.index;
      if (direction === 1) {
        targetIndex = Math.min(targetIndex + 1, allowedMonthSequence.length - 1);
      } else {
        targetIndex = Math.max(targetIndex - 1, 0);
      }

      const target = allowedMonthSequence[targetIndex];
      return finalize(target.month, target.offset);
    });
  };

  const rangeLabel = useMemo(() => {
    if (selectedDates.length === 0) return "—";
    if (mode === "daily") {
      return formatArabicDate(selectedDates[0], true);
    }
    if (mode === "weekly") {
      const start = selectedDates[0];
      const end = selectedDates[selectedDates.length - 1];
      return `${formatArabicDate(start, false)} – ${formatArabicDate(end, false)}`;
    }
    const month = arabicMonthNames[anchorDate.getUTCMonth() + 1];
    const year = anchorDate.getUTCFullYear();
    return `${month} ${year}`;
  }, [mode, selectedDates, anchorDate]);

  const totalCells = students.length * selectedDateIsos.length;
  const statusCounts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    students.forEach((student) => {
      const row = matrix[student.id] ?? {};
      selectedDateIsos.forEach((dateIso) => {
        const status = row[dateIso] ?? "present";
        if (status === "present") present += 1;
        else if (status === "absent") absent += 1;
        else excused += 1;
      });
    });
    return { present, absent, excused };
  }, [matrix, students, selectedDateIsos]);

  const presentCount = statusCounts.present;
  const absentCount = statusCounts.absent;
  const excusedCount = statusCounts.excused;
  const effectiveCells = Math.max(0, totalCells - excusedCount);
  const percentage = effectiveCells > 0 ? Math.round((presentCount / effectiveCells) * 100) : 100;

  const toggleWeekCollapse = useCallback((key: string) => {
    setCollapsedWeeks((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  }, []);

  const toggleWeeklyCollapse = useCallback((iso: string) => {
    setWeeklyCollapsed((prev) => ({
      ...prev,
      [iso]: !(prev[iso] ?? true),
    }));
  }, []);

  const getStatusTone = (status: AttendanceStatus) => {
    if (status === "present") return { label: "حاضر", pill: "bg-chart-1/20 text-chart-1", row: "bg-chart-1/5" };
    if (status === "absent") return { label: "غائب", pill: "bg-destructive/20 text-destructive", row: "bg-destructive/5" };
    return { label: "معذور", pill: "bg-amber-500/20 text-amber-800 dark:text-amber-200", row: "bg-amber-500/10" };
  };

  const dailyContent = !disableDailyView && mode === "daily" && selectedDateIsos[0]
    ? (
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {students.map((student, idx) => {
          const dateIso = selectedDateIsos[0];
          const status = matrix[student.id]?.[dateIso] ?? "present";
          const tone = getStatusTone(status);
          return (
            <div
              key={student.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border border-border",
                tone.row,
              )}
              data-testid={`attendance-row-${idx}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{student.name}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleCell(student.id, dateIso)}
                className={cn("text-sm px-3 py-1 rounded-full transition-colors", tone.pill)}
              >
                {tone.label}
              </button>
            </div>
          );
        })}
      </div>
    )
    : null;

  const weeklyContent = mode === "weekly"
    ? (() => {
        const columns: (Date | null)[] = [null, null, null, null, null];
        selectedDates.forEach((date) => {
          const weekday = date.getUTCDay();
          const index = weekdayOrder.indexOf(weekday);
          if (index !== -1) {
            columns[index] = date;
          }
        });

        return (
          <>
            <div className="space-y-3 sm:hidden">
              {columns.map((date, idx) => {
                if (!date) {
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground"
                    >
                      <div className="font-medium">{weekdayLabels[idx]}</div>
                      <div className="text-xs">لا يوجد دوام</div>
                    </div>
                  );
                }

                const iso = formatIso(date);
                const isCollapsed = weeklyCollapsed[iso] ?? true;
                return (
                  <div key={idx} className="rounded-xl border border-border/60 bg-background p-2 shadow-sm">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right"
                      onClick={() => toggleWeeklyCollapse(iso)}
                    >
                      <div>
                        <div className="text-sm font-semibold">{weekdayLabels[idx]}</div>
                        <div className="text-xs text-muted-foreground">{formatArabicDate(date, false)}</div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-150",
                          isCollapsed ? "rotate-180" : "rotate-0",
                        )}
                      />
                    </button>
                    {!isCollapsed ? (
                      <div className="mt-2 space-y-2 px-2 pb-2">
                        {students.map((student) => {
                          const status = matrix[student.id]?.[iso] ?? "present";
                          const tone = getStatusTone(status);
                          return (
                            <div
                              key={student.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs"
                            >
                              <span className="truncate font-medium">{student.name}</span>
                              <button
                                type="button"
                                onClick={() => toggleCell(student.id, iso)}
                                className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone.pill)}
                              >
                                {tone.label}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[640px] border-collapse text-center">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="sticky right-0 bg-muted/60 px-3 py-2 text-sm font-medium">الطالب</th>
                    {columns.map((date, idx) => (
                      <th
                        key={idx}
                        className={cn("px-3 py-2 text-sm font-medium", columnHeaderClasses[idx] ?? "")}
                      >
                        <div>{weekdayLabels[idx]}</div>
                        <div className="text-xs text-muted-foreground">
                          {date ? formatArabicDate(date, false) : "—"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, rowIdx) => (
                    <tr key={student.id} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="sticky right-0 bg-background px-3 py-2 text-right font-medium">
                        {student.name}
                      </td>
                      {columns.map((date, idx) => {
                        const tone = columnCellClasses[idx] ?? "";
                        if (!date) {
                          return (
                            <td key={idx} className={cn("px-2 py-2 text-muted-foreground", tone)}>
                              —
                            </td>
                          );
                        }
                        const iso = formatIso(date);
                        const status = matrix[student.id]?.[iso] ?? "present";
                        const statusTone = getStatusTone(status);
                        return (
                          <td key={idx} className={cn("px-2 py-2", tone)}>
                            <button
                              type="button"
                              onClick={() => toggleCell(student.id, iso)}
                              className={cn(
                                "mx-auto flex h-7 min-w-16 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors",
                                statusTone.pill,
                              )}
                            >
                              {statusTone.label}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()
    : null;

  const monthlyContent = mode === "monthly"
    ? (() => {
        const weeks = buildMonthlyWeeks(selectedDates);
        return (
          <div className="space-y-6">
            {weeks.map((week, weekIdx) => {
              const palette = weekAccentPalette[weekIdx % weekAccentPalette.length];
              const weekKey = `${anchorKey}-week-${weekIdx}`;
              const isCollapsed = collapsedWeeks[weekKey] ?? true;
              const activeDays = week.filter((day): day is Date => Boolean(day));

              return (
                <div
                  key={weekIdx}
                  className={cn("rounded-xl border shadow-sm overflow-hidden", palette.border ?? "border-border/60")}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2 text-right",
                      "transition-colors duration-150",
                      palette.header ?? "bg-muted/40 text-foreground",
                    )}
                    onClick={() => toggleWeekCollapse(weekKey)}
                  >
                    <span className="font-semibold">الأسبوع {weekIdx + 1}</span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[120px]">
                        {activeDays.length > 0
                          ? activeDays.map((day) => formatArabicDate(day, false)).join(" – ")
                          : "—"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-150",
                          isCollapsed ? "rotate-180" : "rotate-0",
                        )}
                      />
                    </span>
                  </button>
                  {!isCollapsed ? (
                    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
                      {week.map((date, idx) => {
                        if (!date) {
                          return (
                            <div
                              key={idx}
                              className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground flex flex-col items-center justify-center gap-2"
                            >
                              <span>{weekdayLabels[idx]}</span>
                              <span className="text-xs">لا يوجد دوام</span>
                            </div>
                          );
                        }
                        const iso = formatIso(date);
                        const dayCounts = students.reduce(
                          (acc, student) => {
                            const status = matrix[student.id]?.[iso] ?? "present";
                            if (status === "present") acc.present += 1;
                            else if (status === "absent") acc.absent += 1;
                            else acc.excused += 1;
                            return acc;
                          },
                          { present: 0, absent: 0, excused: 0 },
                        );
                        const saturation =
                          dayCounts.absent === 0 && dayCounts.excused === 0
                            ? "bg-emerald-500/10 border-emerald-300/40"
                            : dayCounts.present === 0 && dayCounts.excused === 0
                            ? "bg-destructive/10 border-destructive/40"
                            : dayCounts.present === 0 && dayCounts.excused > 0
                            ? "bg-amber-500/10 border-amber-300/50"
                            : "bg-background";
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-lg border p-4 transition-colors duration-150 shadow-sm",
                              saturation,
                            )}
                          >
                            <div className="flex items-center justify-between text-sm font-semibold">
                              <span>{weekdayLabels[idx]}</span>
                              <span>{formatArabicDate(date, false)}</span>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {dayCounts.present}/{students.length} حاضر
                              {dayCounts.absent ? ` • ${dayCounts.absent} غائب` : ""}
                              {dayCounts.excused ? ` • ${dayCounts.excused} معذور` : ""}
                            </div>
                            <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
                              {students.map((student) => {
                                const status = matrix[student.id]?.[iso] ?? "present";
                                const tone = getStatusTone(status);
                                return (
                                  <div
                                    key={student.id}
                                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs"
                                  >
                                    <span className="truncate">{student.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleCell(student.id, iso)}
                                      className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone.pill)}
                                    >
                                      {tone.label}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })()
    : null;

  return (
    <div className="space-y-4" data-testid="attendance-calendar">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col items-center justify-between sm:flex-row">
            <div>
              <CardTitle>تاريخ الحضور</CardTitle>
              <CardDescription>اختر النطاق الزمني ثم قم بتعديل حضور الطلبة عبر مربعات التحديد.</CardDescription>
            </div>
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <TabsList className="grid grid-cols-3 gap-1 text-xs sm:gap-2 sm:text-sm">
                <TabsTrigger value="monthly" className="gap-2">
                  <CalendarDays className="w-4 h-4" /> شهري
                </TabsTrigger>
                <TabsTrigger value="weekly" className="gap-2">
                  <CalendarRange className="w-4 h-4" /> أسبوعي
                </TabsTrigger>
                {!disableDailyView ? (
                  <TabsTrigger value="daily" className="gap-2">
                    <Calendar className="w-4 h-4" /> يومي
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} data-testid="button-prev-range">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div
                className="px-2 py-1 bg-accent rounded-md min-w-[120px] max-w-[180px] truncate text-center text-xs sm:text-sm sm:min-w-[160px] sm:max-w-none"
                data-testid="selected-range"
              >
                {rangeLabel}
              </div>
              <Button variant="outline" size="icon" onClick={() => navigate(1)} data-testid="button-next-range">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(mode === "weekly" || mode === "monthly") && (
                <Button variant="default" size="sm" onClick={handleApplyChanges} data-testid="button-apply-changes">
                  حفظ التغييرات
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleMarkAll("present")} data-testid="button-mark-all-present">
                تحديد الكل حاضر
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleMarkAll("absent")} data-testid="button-mark-all-absent">
                تحديد الكل غائب
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleMarkAll("excused")} data-testid="button-mark-all-excused">
                تحديد الكل معذور
              </Button>
            </div>
          </div>

          {dailyContent}
          {weeklyContent}
          {monthlyContent}

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-chart-1/10 p-3">
              <p className="text-sm text-muted-foreground">الحضور</p>
              <p className="text-2xl font-bold text-chart-1" data-testid="present-count">
                {presentCount}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-destructive/10 p-3">
              <p className="text-sm text-muted-foreground">الغياب</p>
              <p className="text-2xl font-bold text-destructive" data-testid="absent-count">
                {absentCount}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-amber-500/10 p-3">
              <p className="text-sm text-muted-foreground">الأعذار</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-200" data-testid="excused-count">
                {excusedCount}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-primary/10 p-3">
              <p className="text-sm text-muted-foreground">النسبة</p>
              <p className="text-2xl font-bold text-primary" data-testid="attendance-percentage">
                {percentage}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
