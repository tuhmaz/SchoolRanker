import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Instructions() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">التعليمات</h1>
        <p className="text-muted-foreground mt-2">
          دليل استخدام النظام خطوة بخطوة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>كيفية الحصول على كشف الطلبة من منصة أجيال</CardTitle>
          <CardDescription>اتبع الخطوات التالية للحصول على الملف المطلوب</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal mr-6 space-y-3">
            <li className="text-foreground">
              بعد تسجيل الدخول إلى منصة أجيال، اذهب إلى <strong>"القوائم والخدمات"</strong>
            </li>
            <li className="text-foreground">
              ثم اختر <strong>"التقارير"</strong>
            </li>
            <li className="text-foreground">
              من <strong>"تقارير الطلبة"</strong>، اختر <strong>"كشف الطلبة"</strong>
            </li>
            <li className="text-foreground">
              قم بتحميل الملف بصيغة Excel (.xlsx أو .xls)
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>خطوات استخدام النظام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">التجهيزات الأساسية</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  قم برفع ملف الطلبة وإدخال معلومات المعلم والمدرسة وتحديد المواد الدراسية
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">اختيار النماذج</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  اختر النموذج المناسب لكل نوع من السجلات حسب تفضيلاتك
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">إنشاء السجلات</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  قم بإنشاء السجلات المطلوبة (جانبي، أداء، رئيسي، حضور) وطباعتها أو تحميلها
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">4</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">تتبع الحضور</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  استخدم دفتر الحضور والغياب لتسجيل حضور الطلبة بشكل يومي
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-r-4 border-r-chart-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-lightbulb text-chart-1"></i>
            نصائح مهمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-chart-1 mt-1"></i>
              <span>تأكد من كتابة أسماء المواد بشكل دقيق ومطابق للأسماء الرسمية</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-chart-1 mt-1"></i>
              <span>احفظ البيانات بانتظام لتجنب فقدانها</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-chart-1 mt-1"></i>
              <span>راجع المعاينة قبل الطباعة للتأكد من صحة البيانات</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-chart-1 mt-1"></i>
              <span>استخدم خاصية التصدير إلى PDF للحفظ والطباعة لاحقاً</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
