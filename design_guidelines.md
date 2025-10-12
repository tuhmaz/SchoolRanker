# تصميم نظام إدارة سجلات الطلبة - دليل التصميم الشامل

## نهج التصميم

**Design System Approach: Material Design مع تكييف كامل للغة العربية**

هذا نظام إنتاجي utility-focused يركز على الكفاءة والوضوح. اخترنا Material Design لأنه يوفر:
- مكونات واضحة ومباشرة للتطبيقات الإنتاجية
- نظام شبكي قوي لترتيب البيانات الكثيفة
- دعم ممتاز للـ RTL والواجهات العربية
- تجربة مألوفة للمستخدمين في التطبيقات التعليمية

**المبادئ الأساسية:**
- الوضوح والبساطة أولاً
- التركيز على المحتوى والوظائف
- سهولة الاستخدام للمعلمين من مختلف الأعمار
- استجابة سريعة وأداء عالي

## نظام الألوان

### الوضع النهاري (Light Mode - الافتراضي)
- **اللون الأساسي Primary**: 210 90% 48% (أزرق تعليمي احترافي)
- **اللون الثانوي Secondary**: 142 76% 36% (أخضر للإجراءات الإيجابية)
- **اللون التحذيري Warning**: 38 92% 50% (برتقالي للتنبيهات)
- **اللون الخطر Danger**: 0 84% 60% (أحمر للحذف والإلغاء)
- **الخلفية الرئيسية**: 210 20% 98% (رمادي فاتح جداً)
- **الخلفية الثانوية**: 0 0% 100% (أبيض للكروت والنماذج)
- **النص الأساسي**: 220 25% 10% (رمادي داكن للقراءة المريحة)
- **النص الثانوي**: 220 15% 40% (رمادي متوسط)
- **الحدود Borders**: 220 13% 91% (رمادي فاتح)

### الوضع الليلي (Dark Mode)
- **الخلفية الرئيسية**: 220 25% 12%
- **الخلفية الثانوية**: 220 22% 16%
- **النص الأساسي**: 210 20% 98%
- **النص الثانوي**: 210 15% 70%
- الألوان الوظيفية تبقى بنفس الـ Hue مع تعديل بسيط في Lightness

## نظام الطباعة

**الخطوط:**
- العناوين الرئيسية: "Cairo" bold weight 700
- العناوين الفرعية: "Cairo" semi-bold weight 600
- النص الأساسي: "Tajawal" regular weight 400
- النص الثانوي: "Tajawal" light weight 300

**أحجام الخطوط:**
- عنوان الصفحة h1: text-3xl (2rem)
- عنوان القسم h2: text-2xl (1.5rem)
- عنوان فرعي h3: text-xl (1.25rem)
- نص أساسي: text-base (1rem)
- نص صغير: text-sm (0.875rem)
- نص دقيق: text-xs (0.75rem)

## نظام التباعد (Spacing System)

**الوحدات الأساسية:** استخدام Tailwind units: 2, 4, 6, 8, 12, 16
- المسافات الصغيرة: p-2, m-2, gap-2 (بين العناصر المتقاربة)
- المسافات المتوسطة: p-4, m-4, gap-4 (بين المكونات)
- المسافات الكبيرة: p-6, m-6, gap-6 (بين الأقسام)
- المسافات الضخمة: p-8, m-8, gap-8 (فواصل رئيسية)

## مكتبة المكونات

### التخطيط العام (Layout)
- **Sidebar**: عرض ثابت 280px على Desktop، قابل للطي على Mobile
- **Navbar**: ارتفاع 64px مع ظل خفيف shadow-sm
- **Main Content**: max-w-7xl mx-auto مع padding متجاوب
- **Cards**: bg-white rounded-lg shadow-sm مع border رفيع

### مكونات النماذج (Forms)
- **Input Fields**: height 44px، border-2، rounded-lg، focus:ring-2
- **Dropdowns/Select**: نفس تنسيق Input مع أيقونة chevron-down
- **File Upload Zone**: min-height 200px، border-dashed-2، مع أيقونة upload
- **Buttons Primary**: bg-primary، text-white، h-11، px-6، rounded-lg
- **Buttons Secondary**: border-2، bg-transparent، text-primary
- **Switch Toggle**: w-12 h-6 rounded-full مع transition سلس

### مكونات عرض البيانات
- **Tables**: border-collapse، header bg-gray-100، rows hover:bg-gray-50
- **Data Cards**: grid layout، gap-4، responsive columns
- **Stats Cards**: border-r-4 بلون مميز، p-6، shadow-sm
- **Badges**: px-3 py-1 rounded-full text-xs font-semibold

### المكونات التفاعلية
- **Alerts**: border-r-4، p-4، rounded-lg، مع أيقونة info/success/warning
- **Loading Overlay**: fixed، backdrop-blur، z-50 مع spinner
- **Modal Dialogs**: max-w-2xl، rounded-xl، shadow-2xl، backdrop
- **Toast Notifications**: fixed top-4 left-4، slide-in animation

### التنقل
- **Sidebar Links**: p-3، rounded-lg، hover:bg-gray-100، active:bg-primary-50
- **Breadcrumbs**: text-sm، separator "/"، آخر عنصر bold
- **Tabs**: border-b-3 على النشط، pb-3، text-primary

## الرسوم والأيقونات

- **مكتبة الأيقونات**: Font Awesome 6 (عبر CDN)
- الأيقونات الأساسية: fa-file-excel، fa-print، fa-download، fa-save، fa-trash، fa-edit، fa-check، fa-times، fa-upload
- حجم الأيقونات: text-lg في الأزرار، text-xl في العناوين، text-2xl في الـ empty states

## الصور والوسائط

### Hero Section
- لا يوجد hero تقليدي (نظام وظيفي)
- بدلاً منه: لوحة تحكم (Dashboard) بإحصائيات سريعة وأزرار سريعة

### الرسوم التوضيحية
- استخدام Illustrations بسيطة من unDraw (بألوان Primary) في:
  - Empty states (لا توجد بيانات بعد)
  - صفحة التعليمات
  - رسالة النجاح بعد إتمام العمليات

### أيقونات الوظائف
- أيقونات كبيرة (text-4xl) ملونة في بطاقات الوظائف الرئيسية
- خلفية دائرية ملونة فاتحة (bg-primary-100) خلف كل أيقونة

## الحركة والتفاعل

**استخدام ضئيل جداً للحركة - التركيز على الاستجابة:**
- Transitions أساسية فقط: hover states (200ms ease)
- Loading spinners: rotate animation
- Modal/Alert entry: fade-in + slide-down (300ms)
- لا توجد حركات معقدة أو scroll animations

## الاستجابة (Responsive)

**Breakpoints:**
- Mobile: < 768px (stack كل شيء عمودي)
- Tablet: 768px - 1024px (sidebar قابل للطي، 2 columns)
- Desktop: > 1024px (sidebar ثابت، 3-4 columns، full features)

**تكيف المكونات:**
- Tables: تحويل لـ Cards على Mobile
- Sidebar: hamburger menu على Mobile
- Forms: full-width inputs على Mobile، 2 columns على Desktop
- File upload: تصغير الـ drop zone على Mobile

## إمكانية الوصول (Accessibility)

- دعم كامل للـ RTL (direction: rtl)
- Labels واضحة لكل input
- Focus states بارزة (ring-2)
- Contrast ratio مناسب (WCAG AA)
- keyboard navigation كامل
- ARIA labels للأيقونات

## حالات خاصة

### صفحة التجهيزات
- نموذج متعدد الخطوات: معلومات المعلم → رفع الملف → تحديد المواد
- Progress indicator في الأعلى
- زر حفظ ثابت في الأسفل (sticky)

### معاينة السجلات
- عرض Preview قبل الطباعة
- شريط أدوات ثابت: طباعة، تحميل PDF، تحميل Excel
- تبديل سريع بين النماذج المختلفة

### دفتر الحضور
- تقويم تفاعلي لاختيار التاريخ
- جدول حضور مع checkboxes
- إحصائيات تلقائية (عدد الأيام، نسبة الحضور)

هذا التصميم يوازن بين الاحترافية والبساطة، مع التركيز على تجربة المستخدم العربي والكفاءة الوظيفية.