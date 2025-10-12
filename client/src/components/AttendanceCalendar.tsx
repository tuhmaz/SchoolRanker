import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  present: boolean;
}

interface AttendanceCalendarProps {
  students: { id: string; name: string }[];
  onAttendanceChange?: (date: string, records: AttendanceRecord[]) => void;
}

export function AttendanceCalendar({ students, onAttendanceChange }: AttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    students.map(s => ({ studentId: s.id, studentName: s.name, present: true }))
  );

  const handleToggleAttendance = (studentId: string) => {
    const newAttendance = attendance.map(record =>
      record.studentId === studentId ? { ...record, present: !record.present } : record
    );
    setAttendance(newAttendance);
    if (onAttendanceChange) {
      onAttendanceChange(selectedDate.toISOString(), newAttendance);
    }
  };

  const handleMarkAll = (present: boolean) => {
    const newAttendance = attendance.map(record => ({ ...record, present }));
    setAttendance(newAttendance);
    if (onAttendanceChange) {
      onAttendanceChange(selectedDate.toISOString(), newAttendance);
    }
  };

  const presentCount = attendance.filter(r => r.present).length;
  const absentCount = attendance.length - presentCount;

  return (
    <div className="space-y-4" data-testid="attendance-calendar">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>تاريخ الحضور</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} data-testid="button-prev-day">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="px-4 py-2 bg-accent rounded-md min-w-[150px] text-center" data-testid="selected-date">
                {selectedDate.toLocaleDateString('ar-SA')}
              </div>
              <Button variant="outline" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} data-testid="button-next-day">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => handleMarkAll(true)} data-testid="button-mark-all-present">
              <i className="fas fa-check ml-1"></i>
              تحديد الكل حاضر
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMarkAll(false)} data-testid="button-mark-all-absent">
              <i className="fas fa-times ml-1"></i>
              تحديد الكل غائب
            </Button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {attendance.map((record, idx) => (
              <div
                key={record.studentId}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate"
                data-testid={`attendance-row-${idx}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={record.present}
                    onCheckedChange={() => handleToggleAttendance(record.studentId)}
                    data-testid={`checkbox-student-${idx}`}
                  />
                  <span className="font-medium">{record.studentName}</span>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full ${record.present ? 'bg-chart-1/10 text-chart-1' : 'bg-destructive/10 text-destructive'}`}>
                  {record.present ? 'حاضر' : 'غائب'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex gap-4">
            <div className="flex-1 bg-chart-1/10 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">الحضور</p>
              <p className="text-2xl font-bold text-chart-1" data-testid="present-count">{presentCount}</p>
            </div>
            <div className="flex-1 bg-destructive/10 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">الغياب</p>
              <p className="text-2xl font-bold text-destructive" data-testid="absent-count">{absentCount}</p>
            </div>
            <div className="flex-1 bg-primary/10 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">النسبة</p>
              <p className="text-2xl font-bold text-primary" data-testid="attendance-percentage">
                {attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
