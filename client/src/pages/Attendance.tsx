import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Attendance() {
  const { toast } = useToast();

  // Mock data - will be replaced with actual student data
  const students = [
    { id: "1", name: "أحمد محمد علي السالم" },
    { id: "2", name: "فاطمة حسن خالد الأحمد" },
    { id: "3", name: "محمود عبدالله سالم حسين" },
    { id: "4", name: "مريم سعيد أحمد محمد" },
    { id: "5", name: "عمر يوسف إبراهيم علي" },
    { id: "6", name: "نور الدين عبدالرحمن" },
    { id: "7", name: "ليلى خالد محمود" },
    { id: "8", name: "حسام الدين أحمد" }
  ];

  const handleDownload = () => {
    toast({
      title: "جاري التحميل",
      description: "سيتم تحميل سجل الحضور",
    });
  };

  const handlePrint = () => {
    toast({
      title: "جاري الطباعة",
      description: "سيتم فتح نافذة الطباعة",
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">دفتر حضور وغياب</h1>
          <p className="text-muted-foreground mt-2">
            تتبع حضور الطلبة بشكل يومي مع تقارير شهرية
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} data-testid="button-download-attendance">
            <Download className="w-4 h-4 ml-2" />
            تحميل
          </Button>
          <Button variant="outline" onClick={handlePrint} data-testid="button-print-attendance">
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
        </div>
      </div>

      <AttendanceCalendar
        students={students}
        onAttendanceChange={(date, records) => {
          console.log("Attendance updated:", date, records);
        }}
      />
    </div>
  );
}
