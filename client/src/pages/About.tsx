import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">عن النظام</h1>
        <p className="text-muted-foreground mt-2">
          معلومات حول نظام إدارة سجلات الطلبة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>نظام إدارة سجلات الطلبة - منصة أجيال</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            تم تطوير هذا النظام انسجاماً مع توجهات وزارة التربية والتعليم نحو التحول الرقمي 
            وتحديث أدوات العمل التربوي، وبما يتماشى مع منظومة الوزارة الجديدة المعتمدة على منصة "أجيال".
          </p>
          
          <p className="text-muted-foreground leading-relaxed">
            يهدف النظام إلى تسهيل عملية إعداد السجلات المدرسية الجانبية والرسمية، من خلال توفير 
            بيئة رقمية مرنة تُمكّن المعلم من إنجاز مهامه بسرعة ودقة، مع الحفاظ على الشكل المعتمد 
            للسجلات الورقية التي تُطبع في نهاية المطاف.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            يعتمد النظام على كشف الطلبة المستخرج من منصة أجيال، ويقوم تلقائياً بترتيب البيانات 
            وتفريغها في النماذج المعتمدة، مما يوفر على المعلم الوقت والجهد، ويضمن توحيد الشكل 
            والمحتوى وفق المعايير الرسمية المعتمدة من الوزارة.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المميزات الرئيسية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-file-excel text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">معالجة تلقائية</h4>
                <p className="text-sm text-muted-foreground">استخلاص البيانات تلقائياً من ملفات Excel</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-print text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">طباعة احترافية</h4>
                <p className="text-sm text-muted-foreground">تنسيق جاهز للطباعة المباشرة</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-calendar-check text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">دفتر حضور متكامل</h4>
                <p className="text-sm text-muted-foreground">تتبع يومي للحضور والغياب</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-th-large text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">نماذج متعددة</h4>
                <p className="text-sm text-muted-foreground">اختيار من نماذج متنوعة</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-download text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">تصدير متقدم</h4>
                <p className="text-sm text-muted-foreground">تصدير إلى PDF و Excel</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-save text-primary"></i>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">حفظ محلي</h4>
                <p className="text-sm text-muted-foreground">بياناتك محفوظة على جهازك</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <i className="fas fa-envelope text-2xl text-primary"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">للتواصل والاستفسارات</h3>
              <p className="text-muted-foreground mb-4">نحن هنا للمساعدة والإجابة على استفساراتكم</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="default" asChild data-testid="button-contact-email">
                  <a href="mailto:support@school-system.jo">
                    <Mail className="w-4 h-4 ml-2" />
                    إرسال بريد إلكتروني
                  </a>
                </Button>
                <Button variant="outline" asChild data-testid="button-contact-whatsapp">
                  <a href="https://wa.me/962700000000" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-whatsapp ml-2"></i>
                    واتساب
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground py-4">
        <p>© 2024 نظام إدارة سجلات الطلبة. جميع الحقوق محفوظة.</p>
        <p className="mt-1">نسخة 2.0 - محدثة ومطورة</p>
      </div>
    </div>
  );
}
