import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">عن نظام خدمتك لإدارة السجلات المدرسية</h1>
        <p className="text-muted-foreground mt-2">
          حل رقمي متكامل صُمم خصيصاً لتلبية احتياجات المدارس والمعلمين في إدارة السجلات الأكاديمية بجودة تعتمد عليها
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>منصة مؤسسية بتقنياتنا الخاصة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            طور فريق خدمتك هذه المنصة لتكون البوابة الرسمية لإدارة السجلات التعليمية، مع الالتزام بأعلى معايير الجودة
            والأمان، وبالاعتماد على خبرة عملية واسعة في المدارس الحكومية والخاصة داخل المملكة.
          </p>
          
          <p className="text-muted-foreground leading-relaxed">
            يقوم النظام بمعالجة بيانات الطلبة والصفوف بشكل ذكي، ويحولها إلى نماذج رسمية مطابقة للقوالب المعتمدة
            من الوزارة، مع توفير أدوات لمراجعة البيانات وتحريرها قبل الطباعة النهائية.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            نؤمن بضرورة تمكين المدرسة من امتلاك بياناتها، لذلك يعمل النظام محلياً على جهاز المستخدم مع إمكانية
            المزامنة الآمنة عند الحاجة، مما يضمن الخصوصية وسرعة الوصول دون تعقيد في البنية التحتية.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مزايا المنصة المتكاملة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-layer-group text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">تكامل ذكي</h4>
                <p className="text-sm text-muted-foreground">استيراد مباشر لبيانات منصة "أجيال" وتحويلها تلقائياً إلى نماذجنا المعتمدة</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-shield-check text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">حماية البيانات</h4>
                <p className="text-sm text-muted-foreground">تشفير للملفات الحساسة وإدارة صلاحيات متعددة للمستخدمين</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-tasks text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">إدارة متقدمة للسجلات</h4>
                <p className="text-sm text-muted-foreground">لوحات تحكم تفاعلية لدفاتر العلامات، الحضور، والتقويمات الفصلية</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-puzzle-piece text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">تخصيص سريع</h4>
                <p className="text-sm text-muted-foreground">خيارات مرنة لتعديل الشعارات، العناوين، وإعدادات الطباعة بما يتوافق مع هوية المدرسة</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-cloud-arrow-down text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">خيارات تصدير متعددة</h4>
                <p className="text-sm text-muted-foreground">حفظ كملفات Excel رسمية أو PDF مع المحافظة على كامل التنسيق</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-sync text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">تحديثات مستمرة</h4>
                <p className="text-sm text-muted-foreground">تحسينات متواصلة لمواكبة سياسات الوزارة ومتطلبات المدارس</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>منهجية العمل في نظام خدمتك</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="font-semibold text-foreground">التحضير الذكي</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              يبدأ النظام بقراءة ملفات الطلبة والصفوف، ثم يطبق قواعد التحقق الخاصة بنا لضمان اكتمال البيانات
              وصحتها قبل الانتقال إلى مرحلة المعالجة.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">التشكيل الآلي للنماذج</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              يتم توزيع البيانات على النماذج الرسمية بشكل متقن، مع الحفاظ على الهوامش، العناوين، والترويسات المعتمدة
              بحيث تكون جاهزة للطباعة دون الحاجة إلى تعديلات إضافية.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">المراجعة والمشاركة</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              نتيح إمكان التحقق النهائي من مخرجات النظام، وتصديرها بصيغ متعددة لمشاركتها مع الإدارة المدرسية أو الجهات الرسمية بسهولة.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <i className="fas fa-headset text-2xl text-primary"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">خدمة دعم متخصصة</h3>
              <p className="text-muted-foreground mb-4">
                فريق خدمتك يرافقكم خطوة بخطوة لتطبيق النظام داخل المدرسة وتدريب الطواقم التعليمية والإدارية
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="default" asChild data-testid="button-contact-email">
                  <a href="mailto:support@khadmatak.com">
                    <Mail className="w-4 h-4 ml-2" />
                    تواصل عبر البريد الإلكتروني
                  </a>
                </Button>
                <Button variant="outline" asChild data-testid="button-contact-whatsapp">
                  <a href="https://wa.me/962700000000" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-whatsapp ml-2"></i>
                    دعم واتساب فوري
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground py-4">
        <p>© 2025 خدمتك لإدارة السجلات المدرسية. جميع الحقوق محفوظة.</p>
        <p className="mt-1">الإصدار 3.0 الاحترافي</p>
      </div>
    </div>
  );
}
