import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SideGradebook() {
  const { toast } = useToast();

  const handleGenerate = () => {
    toast({
      title: "جاري الإنشاء",
      description: "سيتم إنشاء سجل العلامات الجانبي",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إنشاء سجل علامات جانبي</h1>
        <p className="text-muted-foreground mt-2">
          قم بإنشاء وطباعة سجل العلامات الجانبي بتنسيق احترافي
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل العلامات الجانبي</CardTitle>
          <CardDescription>
            اذهب إلى صفحة "التجهيزات" لرفع ملف الطلبة أولاً، ثم اضغط على الزر أدناه
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-6 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">سيتم إنشاء السجل بناءً على البيانات المحفوظة</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} data-testid="button-generate-side-gradebook">
              <FileSpreadsheet className="w-4 h-4 ml-2" />
              معالجة وإنشاء السجل
            </Button>
            <Button variant="outline" data-testid="button-download-excel">
              <Download className="w-4 h-4 ml-2" />
              تحميل Excel
            </Button>
            <Button variant="outline" data-testid="button-print">
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
