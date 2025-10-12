import { useState } from "react";
import { TemplateSelector } from "@/components/TemplateSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sideGradebookTemplates = [
  { id: "side1", name: "النموذج الكلاسيكي", description: "تصميم تقليدي بسيط وواضح", preview: "fa-file-alt" },
  { id: "side2", name: "النموذج المفصل", description: "يتضمن ملاحظات وتفاصيل إضافية", preview: "fa-file-invoice" },
  { id: "side3", name: "النموذج المختصر", description: "مثالي للطباعة السريعة", preview: "fa-file-contract" }
];

const performanceTemplates = [
  { id: "perf1", name: "نموذج الأداء الشامل", description: "تقييم كامل مع ملاحظات", preview: "fa-clipboard-list" },
  { id: "perf2", name: "نموذج الأداء المبسط", description: "تقييم سريع ومختصر", preview: "fa-clipboard-check" },
  { id: "perf3", name: "نموذج الملاحظات", description: "التركيز على الملاحظات النوعية", preview: "fa-clipboard" }
];

const mainGradebookTemplates = [
  { id: "main1", name: "الدفتر الرسمي", description: "النموذج المعتمد من الوزارة", preview: "fa-book" },
  { id: "main2", name: "الدفتر المحدث", description: "تصميم عصري مع جداول واضحة", preview: "fa-book-open" },
  { id: "main3", name: "الدفتر المخصص", description: "قابل للتخصيص حسب الحاجة", preview: "fa-bookmark" }
];

export default function Templates() {
  const { toast } = useToast();
  const [selectedSide, setSelectedSide] = useState("side1");
  const [selectedPerf, setSelectedPerf] = useState("perf1");
  const [selectedMain, setSelectedMain] = useState("main1");

  const handleSave = () => {
    toast({
      title: "تم الحفظ",
      description: "تم حفظ اختياراتك للنماذج",
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">اختيار نماذج الكشوفات</h1>
        <p className="text-muted-foreground mt-2">
          اختر النموذج المناسب لكل نوع من السجلات
        </p>
      </div>

      <Tabs defaultValue="side" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="side" data-testid="tab-side-templates">سجل علامات جانبي</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance-templates">سجل أداء</TabsTrigger>
          <TabsTrigger value="main" data-testid="tab-main-templates">دفتر رئيسي</TabsTrigger>
        </TabsList>

        <TabsContent value="side" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نماذج سجل العلامات الجانبي</CardTitle>
              <CardDescription>اختر النموذج المفضل لسجل العلامات الجانبي</CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateSelector
                templates={sideGradebookTemplates}
                selectedTemplateId={selectedSide}
                onSelect={setSelectedSide}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نماذج سجل الأداء والملاحظات</CardTitle>
              <CardDescription>اختر النموذج المفضل لسجل الأداء</CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateSelector
                templates={performanceTemplates}
                selectedTemplateId={selectedPerf}
                onSelect={setSelectedPerf}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="main" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نماذج دفتر العلامات الرئيسي</CardTitle>
              <CardDescription>اختر النموذج المفضل للدفتر الرئيسي</CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateSelector
                templates={mainGradebookTemplates}
                selectedTemplateId={selectedMain}
                onSelect={setSelectedMain}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} data-testid="button-save-templates">
          <Save className="w-4 h-4 ml-2" />
          حفظ الاختيارات
        </Button>
      </div>
    </div>
  );
}
