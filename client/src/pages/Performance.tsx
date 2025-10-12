import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Performance() {
  const { toast } = useToast();

  const handleGenerate = () => {
    toast({
      title: "جاري الإنشاء",
      description: "سيتم إنشاء سجل الأداء والملاحظات",
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إنشاء سجل أداء وملاحظة</h1>
        <p className="text-muted-foreground mt-2">
          قم بإنشاء سجل الأداء والملاحظات للطلبة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل الأداء والملاحظات</CardTitle>
          <CardDescription>
            اذهب إلى صفحة "التجهيزات" لرفع ملف الطلبة أولاً، ثم اضغط على الزر أدناه
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-6 text-center">
            <FileText className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">سجل شامل لتقييم أداء الطلبة</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} data-testid="button-generate-performance">
              <FileText className="w-4 h-4 ml-2" />
              معالجة وإنشاء السجل
            </Button>
            <Button variant="outline" data-testid="button-download-pdf">
              <Download className="w-4 h-4 ml-2" />
              تحميل PDF
            </Button>
            <Button variant="outline" data-testid="button-print-performance">
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
