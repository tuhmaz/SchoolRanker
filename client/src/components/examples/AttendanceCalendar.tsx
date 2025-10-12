import { AttendanceCalendar } from '../AttendanceCalendar';

export default function AttendanceCalendarExample() {
  const students = [
    { id: "1", name: "أحمد محمد علي" },
    { id: "2", name: "فاطمة حسن خالد" },
    { id: "3", name: "محمود عبدالله سالم" },
    { id: "4", name: "مريم سعيد أحمد" },
    { id: "5", name: "عمر يوسف إبراهيم" }
  ];

  return (
    <div className="p-6">
      <AttendanceCalendar
        students={students}
        onAttendanceChange={(date, records) => {
          console.log('Attendance updated:', date, records);
        }}
      />
    </div>
  );
}
