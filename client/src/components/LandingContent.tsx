import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  FileSpreadsheet,
  BarChart3,
  Calendar,
  BookOpen,
  CheckCircle,
  Shield,
  Clock,
  Users,
  Download,
  Settings,
  Zap,
  FileCheck
} from "lucide-react";

export function LandingContent() {
  return (
    <div className="space-y-8" dir="rtl">
      {/* Hero Section with H1 */}
      <section className="text-center space-y-4 py-8">
        <div className="flex justify-center mb-6">
          <Logo size="xl" showText={false} />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
          نظام خدمتك - منصة إدارة سجلات الطلبة الإلكترونية
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          نظام متكامل وسهل الاستخدام لإدارة سجلات الطلبة والمعلمين مع معالجة ملفات Excel من منصة أجيال.
          احصل على تقارير دقيقة ومنظمة في دقائق معدودة - آمن وموثوق ومتوافق مع وزارة التربية والتعليم.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-6">
          <Button
            size="lg"
            asChild
            className="bg-[#0f766e] text-white hover:bg-[#0c5f58] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f766e]"
          >
            <Link href="/settings">
              <Settings className="ml-2 h-5 w-5" />
              ابدأ الآن مجاناً
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/instructions">
              <BookOpen className="ml-2 h-5 w-5" />
              دليل الاستخدام
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-foreground">
          لماذا خدمتك؟
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
              <CardTitle>معالجة ملفات Excel</CardTitle>
              <CardDescription>
                رفع ومعالجة ملفات Excel من منصة أجيال بكل سهولة وسرعة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>استيراد تلقائي لبيانات الطلبة والصفوف</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>دعم جميع صيغ Excel من منصة أجيال</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>تقارير الأداء الأكاديمي</CardTitle>
              <CardDescription>
                إنشاء تقارير شاملة لأداء الطلبة في جميع المواد الدراسية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>رصد علامات الطلبة بسهولة ودقة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>حساب المعدلات والنسب المئوية</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 text-primary mb-2" />
              <CardTitle>نظام الحضور والغياب</CardTitle>
              <CardDescription>
                تتبع حضور وغياب الطلبة بشكل يومي ومنظم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>تقويم شهري تفاعلي للحضور</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>تقارير مفصلة عن نسب الغياب</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>آمن وموثوق</CardTitle>
              <CardDescription>
                حماية كاملة لبيانات الطلبة والمعلمين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>تخزين محلي آمن للبيانات</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>لا يتم مشاركة البيانات مع أطراف خارجية</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-primary mb-2" />
              <CardTitle>وفر الوقت والجهد</CardTitle>
              <CardDescription>
                أتمتة المهام الروتينية وتوفير ساعات من العمل
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>إنشاء التقارير في دقائق</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>نماذج جاهزة للطباعة</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>متوافق مع منصة أجيال</CardTitle>
              <CardDescription>
                تكامل كامل مع منصة أجيال التابعة لوزارة التربية والتعليم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>استيراد مباشر من ملفات أجيال</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>تنسيقات معتمدة من الوزارة</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-foreground">
          كيف يعمل النظام؟
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">1. رفع ملف Excel</h3>
            <p className="text-sm text-muted-foreground">
              قم برفع كشف الطلبة من منصة أجيال بصيغة Excel
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">2. إعداد البيانات</h3>
            <p className="text-sm text-muted-foreground">
              أدخل معلومات المعلم والمدرسة وحدد المواد الدراسية
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">3. إدخال البيانات</h3>
            <p className="text-sm text-muted-foreground">
              أدخل العلامات والحضور بطريقة سهلة ومنظمة
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <FileCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">4. طباعة التقارير</h3>
            <p className="text-sm text-muted-foreground">
              احصل على تقارير احترافية جاهزة للطباعة والتسليم
            </p>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-foreground">
          الميزات الرئيسية لنظام خدمتك
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                دفتر العلامات الفرعي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                نظام متكامل لرصد علامات الاختبارات الفرعية والواجبات اليومية.
                يتيح لك إدخال علامات متعددة لكل مادة مع حساب تلقائي للمجاميع والمعدلات.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/side-gradebook">
                  استكشف دفتر العلامات الفرعي
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                تقارير الأداء الأكاديمي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                إنشاء تقارير شاملة لأداء الطلبة مع رسوم بيانية توضيحية ومعدلات تراكمية.
                يدعم النظام التقييم الشهري والفصلي والسنوي للطلبة.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/performance">
                  شاهد تقارير الأداء
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                دفتر العلامات الرئيسي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                السجل الرسمي لعلامات الطلبة النهائية. منظم بطريقة احترافية ومتوافق
                مع المعايير المعتمدة من وزارة التربية والتعليم.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/main-gradebook">
                  افتح دفتر العلامات الرئيسي
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                سجل الحضور والغياب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                تتبع يومي لحضور وغياب الطلبة مع تقويم تفاعلي. يوفر إحصائيات
                دقيقة عن نسب الحضور والغياب لكل طالب.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/attendance">
                  إدارة الحضور والغياب
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 rounded-lg p-8 text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          جاهز للبدء؟
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          انضم إلى مئات المعلمين الذين يستخدمون نظام خدمتك لإدارة سجلات طلبتهم بكفاءة واحترافية.
          النظام مجاني بالكامل وسهل الاستخدام.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-6">
          <Button
            size="lg"
            asChild
            className="bg-[#0f766e] text-white hover:bg-[#0c5f58] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f766e]"
          >
            <Link href="/settings">
              ابدأ الآن مجاناً
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/about">
              تعرف على المزيد
            </Link>
          </Button>
        </div>
      </section>

      {/* SEO Footer Content */}
      <section className="space-y-4 text-sm text-muted-foreground border-t pt-6">
        <h3 className="text-lg font-semibold text-foreground">
          نظام خدمتك - الحل الأمثل لإدارة سجلات الطلبة في المدارس
        </h3>
        <p>
          نظام <strong>خدمتك</strong> هو منصة إلكترونية متطورة مصممة خصيصاً للمعلمين والمعلمات
          في المدارس الحكومية والخاصة. يوفر النظام أدوات احترافية لإدارة <strong>سجلات الطلبة</strong>
          و<strong>دفاتر العلامات</strong> و<strong>الحضور والغياب</strong> بطريقة سهلة وآمنة.
        </p>
        <p>
          متوافق بشكل كامل مع <strong>منصة أجيال</strong> التابعة لوزارة التربية والتعليم، حيث يمكنك
          استيراد بيانات الطلبة مباشرة من ملفات Excel الصادرة عن المنصة. يدعم النظام جميع المراحل
          الدراسية ويوفر قوالب جاهزة للتقارير المدرسية.
        </p>
        <p>
          من خلال نظام خدمتك، يمكنك رصد <strong>علامات الطلبة</strong> في جميع المواد الدراسية،
          وإنشاء <strong>تقارير الأداء الأكاديمي</strong>، ومتابعة <strong>حضور الطلبة</strong>
          بشكل يومي. النظام يوفر لك الوقت والجهد من خلال الحسابات التلقائية للمعدلات والنسب المئوية.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1 bg-secondary rounded-full">نظام إدارة الطلبة</span>
          <span className="px-3 py-1 bg-secondary rounded-full">دفتر العلامات الإلكتروني</span>
          <span className="px-3 py-1 bg-secondary rounded-full">سجل الحضور والغياب</span>
          <span className="px-3 py-1 bg-secondary rounded-full">منصة أجيال</span>
          <span className="px-3 py-1 bg-secondary rounded-full">تقارير المدرسية</span>
          <span className="px-3 py-1 bg-secondary rounded-full">إدارة العلامات</span>
          <span className="px-3 py-1 bg-secondary rounded-full">نظام تعليمي</span>
        </div>
      </section>
    </div>
  );
}
