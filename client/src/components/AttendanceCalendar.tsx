import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AttendanceStatus } from "@/types/attendance";

type Mode = "daily" | "weekly" | "monthly";

type AttendanceMatrix = Record<string, Record<string, boolean>>;

interface AttendanceCalendarProps {
  students: { id: string; name: string }[];
  attendanceByDate?: Record<string, { studentId: string; status: AttendanceStatus }[]>;
  onAttendanceChange?: (updates: Record<string, { studentId: string; present: boolean }[]>) => void;
}

const weekdayLabels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const weekdayOrder = [0, 1, 2, 3, 4];

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

export function AttendanceCalendar({ students, attendanceByDate, onAttendanceChange }: AttendanceCalendarProps) {
  const [mode, setMode] = useState<Mode>("daily");
  const [anchorDate, setAnchorDate] = useState(() => {
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    return base;
  });
  const [matrix, setMatrix] = useState<AttendanceMatrix>({});

  const selectedDates = useMemo(() => {
    if (mode === "daily") {
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

  const selectedDateIsos = useMemo(() => selectedDates.map(formatIso), [selectedDates]);

  useEffect(() => {
    setMatrix((prev) => {
      const next: AttendanceMatrix = {};
      students.forEach((student) => {
        const prevRow = prev[student.id] ?? {};
        const row: Record<string, boolean> = {};
        selectedDateIsos.forEach((dateIso) => {
          const existingEntry = attendanceByDate?.[dateIso]?.find((record) => record.studentId === student.id);
          if (existingEntry) {
            row[dateIso] = existingEntry.status === "present";
          } else if (prevRow[dateIso] !== undefined) {
            row[dateIso] = prevRow[dateIso];
          } else {
            row[dateIso] = true;
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
      const updates: Record<string, { studentId: string; present: boolean }[]> = {};
      selectedDateIsos.forEach((dateIso) => {
        updates[dateIso] = students.map((student) => ({
          studentId: student.id,
          present: next[student.id]?.[dateIso] ?? true,
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
        if (mode === "daily") {
          emitChange(next);
        }
        return next;
      });
    },
    [emitChange, mode],
  );

  const handleApplyChanges = () => {
    emitChange(matrix);
  };

  const toggleCell = (studentId: string, dateIso: string) => {
    updateMatrix((prev) => {
      const next = { ...prev };
      const row = { ...(next[studentId] ?? {}) };
      row[dateIso] = !(row[dateIso] ?? true);
      next[studentId] = row;
      return next;
    });
  };

  const handleMarkAll = (present: boolean) => {
    updateMatrix((prev) => {
      const next = { ...prev };
      students.forEach((student) => {
        const row = { ...(next[student.id] ?? {}) };
        selectedDateIsos.forEach((dateIso) => {
          row[dateIso] = present;
        });
        next[student.id] = row;
      });
      return next;
    });
  };

  const navigate = (direction: 1 | -1) => {
    const next = new Date(anchorDate);
    next.setUTCHours(0, 0, 0, 0);
    if (mode === "daily") {
      next.setUTCDate(next.getUTCDate() + direction);
    } else if (mode === "weekly") {
      next.setUTCDate(next.getUTCDate() + direction * 7);
    } else {
      next.setUTCMonth(next.getUTCMonth() + direction);
    }
    setAnchorDate(next);
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
  const presentCount = useMemo(() => {
    let total = 0;
    students.forEach((student) => {
      const row = matrix[student.id] ?? {};
      selectedDateIsos.forEach((dateIso) => {
        if (row[dateIso] !== false) {
          total += 1;
        }
      });
    });
    return total;
  }, [matrix, students, selectedDateIsos]);

  const absentCount = totalCells - presentCount;
  const percentage = totalCells > 0 ? Math.round((presentCount / totalCells) * 100) : 100;

  const dailyContent = mode === "daily" && selectedDateIsos[0]
    ? (
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {students.map((student, idx) => {
          const dateIso = selectedDateIsos[0];
          const present = matrix[student.id]?.[dateIso] ?? true;
          return (
            <div
              key={student.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border border-border",
                present ? "bg-chart-1/5" : "bg-destructive/5",
              )}
              data-testid={`attendance-row-${idx}`}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={present} onCheckedChange={() => toggleCell(student.id, dateIso)} />
                <span className="font-medium">{student.name}</span>
              </div>
              <span
                className={cn(
                  "text-sm px-3 py-1 rounded-full",
                  present ? "bg-chart-1/20 text-chart-1" : "bg-destructive/20 text-destructive",
                )}
              >
                {present ? "حاضر" : "غائب"}
              </span>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-center">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky right-0 bg-muted/50 px-3 py-2 text-sm font-medium">الطالب</th>
                  {columns.map((date, idx) => (
                    <th key={idx} className="px-3 py-2 text-sm font-medium">
                      <div>{weekdayLabels[idx]}</div>
                      <div className="text-xs text-muted-foreground">
                        {date ? formatArabicDate(date, false) : "—"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="odd:bg-background even:bg-muted/10">
                    <td className="sticky right-0 bg-background px-3 py-2 text-right font-medium">
                      {student.name}
                    </td>
                    {columns.map((date, idx) => {
                      if (!date) {
                        return (
                          <td key={idx} className="px-2 py-2 text-muted-foreground">
                            —
                          </td>
                        );
                      }
                      const iso = formatIso(date);
                      const present = matrix[student.id]?.[iso] ?? true;
                      return (
                        <td key={idx} className="px-2 py-2">
                          <Checkbox checked={present} onCheckedChange={() => toggleCell(student.id, iso)} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()
    : null;

  const monthlyContent = mode === "monthly"
    ? (() => {
        const weeks = buildMonthlyWeeks(selectedDates);
        return (
          <div className="space-y-6">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="rounded-xl border border-border/60 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-muted/40 px-4 py-2">
                  <span className="font-semibold">الأسبوع {weekIdx + 1}</span>
                  <span className="text-sm text-muted-foreground">
                    {week
                      .filter((day): day is Date => Boolean(day))
                      .map((day) => formatArabicDate(day, false))
                      .join(" – ") || "—"}
                  </span>
                </div>
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
                    const presentForDay = students.reduce(
                      (total, student) => (matrix[student.id]?.[iso] === false ? total : total + 1),
                      0,
                    );
                    const saturation =
                      presentForDay === students.length
                        ? "bg-emerald-500/10 border-emerald-300/40"
                        : presentForDay === 0
                        ? "bg-destructive/10 border-destructive/40"
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
                          {presentForDay}/{students.length} حاضر
                        </div>
                        <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
                          {students.map((student) => {
                            const present = matrix[student.id]?.[iso] ?? true;
                            return (
                              <label
                                key={student.id}
                                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs"
                              >
                                <span className="truncate">{student.name}</span>
                                <Checkbox
                                  checked={present}
                                  onCheckedChange={() => toggleCell(student.id, iso)}
                                  className="h-4 w-4"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()
    : null;

  return (
    <div className="space-y-4" data-testid="attendance-calendar">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>تاريخ الحضور</CardTitle>
              <CardDescription>اختر النطاق الزمني ثم قم بتعديل حضور الطلبة عبر مربعات التحديد.</CardDescription>
            </div>
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="daily" className="gap-2">
                  <Calendar className="w-4 h-4" /> يومي
                </TabsTrigger>
                <TabsTrigger value="weekly" className="gap-2">
                  <CalendarRange className="w-4 h-4" /> أسبوعي
                </TabsTrigger>
                <TabsTrigger value="monthly" className="gap-2">
                  <CalendarDays className="w-4 h-4" /> شهري
                </TabsTrigger>
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
              <div className="px-4 py-2 bg-accent rounded-md min-w-[160px] text-center" data-testid="selected-range">
                {rangeLabel}
              </div>
              <Button variant="outline" size="icon" onClick={() => navigate(1)} data-testid="button-next-range">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              {(mode === "weekly" || mode === "monthly") && (
                <Button variant="default" size="sm" onClick={handleApplyChanges} data-testid="button-apply-changes">
                  حفظ التغييرات
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleMarkAll(true)} data-testid="button-mark-all-present">
                تحديد الكل حاضر
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleMarkAll(false)} data-testid="button-mark-all-absent">
                تحديد الكل غائب
              </Button>
            </div>
          </div>

          {dailyContent}
          {weeklyContent}
          {monthlyContent}

          <div className="grid gap-4 sm:grid-cols-3">
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
