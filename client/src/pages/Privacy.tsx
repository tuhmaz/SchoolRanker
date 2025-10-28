import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Privacy() {
  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">سياسة الخصوصية وحماية البيانات لنظام خدمتك</h1>
        <p className="text-muted-foreground">
          نلتزم في "خدمتك" بحماية خصوصية المدارس والمعلمين والطلبة. توضح هذه السياسة كيفية تعاملنا مع البيانات عند استخدام المنصة.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>معلومات عامة عن الخدمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            "خدمتك" هو نظام إلكتروني مجاني لإدارة السجلات المدرسية، يعمل بالكامل داخل متصفح المستخدم دون الحاجة إلى إنشاء حساب أو تسجيل دخول.
          </p>
          <p>
            لا نقوم بتخزين أي بيانات شخصية أو تعليمية على خوادمنا. جميع العمليات تتم محلياً على جهاز المستخدم، مع إمكانية حفظ المخرجات في ملفات Excel أو PDF يختارها المستخدم.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>البيانات التي نتعامل معها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            عند استخدام أدواتنا، قد تقوم برفع ملفات Excel تحتوي على بيانات الطلبة والصفوف. تُعالج هذه البيانات لحظياً داخل المتصفح فقط بهدف إنشاء الدفاتر والسجلات.
          </p>
          <p>
            لا يتم إرسال هذه الملفات أو البيانات إلى خوادم خارجية ولا يتم الاحتفاظ بها بعد إغلاق المتصفح، إلا إذا اختار المستخدم حفظ نسخة على جهازه.
          </p>
          <p>
            لا يحتوي النظام على أي نموذج لتجميع بيانات التواصل أو الاشتراك أو إنشاء حسابات.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ملفات تعريف الارتباط وأدوات القياس</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            نستخدم ملفات تعريف الارتباط الضرورية لضمان عمل المنصة بشكل صحيح. بالإضافة إلى ذلك، قد نستعمل خدمات Google مثل AdSense وGoogle Analytics لتوفير تجربة محسنة.
          </p>
          <p>
            تعرض Google نافذة موافقة على ملفات تعريف الارتباط (Funding Choices) امتثالاً للوائح حماية الخصوصية. يمكنك إدارة تفضيلاتك مباشرةً من تلك النافذة أو من إعدادات المتصفح.
          </p>
          <p>
            لا نسمح بالنشاط الإعلاني المخصص للطلاب القصر، ونلتزم بسياسات Google والأنظمة المحلية في هذا الشأن.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أمن المعلومات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            نعتمد أفضل الممارسات لتأمين الملفات التي يتم تحميلها ومعالجتها محلياً، ويُنصح المستخدمون بحماية أجهزتهم بكلمات مرور وتشفير ملفاتهم الحساسة عند الحاجة.
          </p>
          <p>
            عند استخدام مزايا التصدير أو الطباعة، تكون السيطرة الكاملة على مكان حفظ الملفات ومشاركتها بيد المستخدم.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>حقوق المستخدمين وخياراتهم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            بما أن النظام لا يخزن بيانات في قاعدة بيانات مركزية، يمكنك حذف أي معلومات نهائياً من خلال إغلاق المتصفح أو حذف الملفات المصدّرة من جهازك.
          </p>
          <p>
            إذا كانت لديك استفسارات إضافية حول الخصوصية أو ترغب في تقديم طلب رسمي بخصوص البيانات، يمكنك التواصل معنا عبر البريد الإلكتروني: <a href="mailto:support@khadmatak.com" className="text-primary underline">support@khadmatak.com</a>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تحديثات السياسة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            قد نقوم بتحديث هذه السياسة من وقت لآخر لمواكبة المتطلبات القانونية أو التطويرات التقنية. سيتم نشر تاريخ آخر تحديث في أعلى هذه الصفحة، ويُعد استمرارك في استخدام المنصة موافقةً على السياسة المحدثة.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <footer className="text-sm text-muted-foreground text-center">
        <p>آخر تحديث: 28 أكتوبر 2025</p>
        <p>للاستفسارات العاجلة، يرجى التواصل عبر واتساب: <a href="https://wa.me/962700000000" target="_blank" rel="noopener noreferrer" className="text-primary underline">+962 7000 00000</a></p>
      </footer>
    </div>
  );
}
