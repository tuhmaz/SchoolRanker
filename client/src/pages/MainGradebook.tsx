import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MainGradebook() {
  const { toast } = useToast();

  const handleGenerate = () => {
    toast({
      title: "جاري الإنشاء",
      description: "سيتم إنشاء دفتر العلامات الرئيسي",
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إنشاء دفتر علامات رئيسي</h1>
        <p className="text-muted-foreground mt-2">
          تأكد من أن جميع البيانات في صفحة "التجهيزات" صحيحة ومحفوظة
        </p>
      </div>

      <Card className="border-r-4 border-r-chart-3">
        <CardHeader>
          <div className="flex items-start gap-3">
            <i className="fas fa-star text-2xl text-chart-3 mt-1"></i>
            <div>
              <CardTitle>تنبيه مهم</CardTitle>
              <CardDescription className="mt-2">
                إذا كانت طابعتك تدعم الطباعة على الوجهين، يمكنك الطباعة مباشرة. وإلا:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal mr-6 space-y-1 text-sm text-muted-foreground">
            <li>اختر الطباعة إلى PDF</li>
            <li>بعد حفظ الملف، قم بفتحه من جديد</li>
            <li>اطبع الصفحات الفردية فقط</li>
            <li>أعد إدخال الأوراق في الطابعة بالاتجاه الصحيح</li>
            <li>اطبع الصفحات الزوجية لإكمال الطباعة</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>دفتر العلامات الرئيسي</CardTitle>
          <CardDescription>
            دفتر شامل بجميع المواد والعلامات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-6 text-center">
            <FileCheck className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">دفتر كامل مع دعم الطباعة على الوجهين</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} data-testid="button-generate-main-gradebook">
              <FileCheck className="w-4 h-4 ml-2" />
              معالجة وإنشاء الدفتر
            </Button>
            <Button variant="outline" data-testid="button-download-main-pdf">
              <Download className="w-4 h-4 ml-2" />
              تحميل PDF
            </Button>
            <Button variant="outline" data-testid="button-print-main">
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
