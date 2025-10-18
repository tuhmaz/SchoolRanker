# دليل نشر تطبيق SchoolRanker على الاستضافة

## المتطلبات الأساسية

1. **استضافة تدعم Node.js** مع Phusion Passenger (مثل cPanel أو Plesk)
2. **Node.js 18 أو أحدث**
3. **npm** لتثبيت المكتبات

## خطوات النشر

### 1. بناء المشروع محلياً

قبل رفع المشروع على الاستضافة، يجب بناؤه أولاً:

```bash
npm install
npm run build
```

هذا سينشئ مجلد `dist` يحتوي على:
- `dist/index.js` - كود الخادم المجمّع
- `dist/public/` - ملفات الواجهة الأمامية (HTML, CSS, JS)

### 2. رفع الملفات على الاستضافة

ارفع هذه الملفات والمجلدات إلى مجلد `public_html` (أو المجلد الرئيسي للاستضافة):

**الملفات الأساسية:**
- `app.js` - نقطة البداية لـ Passenger
- `.htaccess` - إعدادات Apache/Passenger
- `.passengerrc.json` - إعدادات Passenger
- `package.json` - قائمة المكتبات المطلوبة
- `package-lock.json` - إصدارات المكتبات المحددة

**المجلدات الأساسية:**
- `dist/` - الكود المجمّع
- `templates/` - قوالب Excel
- `node_modules/` - المكتبات (أو قم بتشغيل `npm install` على الخادم)
- `exports/` - سيتم إنشاؤه تلقائياً

**لا تحتاج لرفع:**
- `client/` - تم دمجه في `dist/public`
- `server/` - تم دمجه في `dist/index.js`
- `.git/` - ليس ضرورياً للإنتاج

### 3. إعداد ملف .htaccess

تأكد من تحديث المسار في ملف `.htaccess`:

```apache
PassengerAppRoot /home/YOUR_USERNAME/public_html
```

غيّر `YOUR_USERNAME` إلى اسم المستخدم الخاص بك على الاستضافة.

إذا كنت لا تعرف المسار الكامل، يمكنك إنشاء ملف PHP صغير:

```php
<?php
echo __DIR__;
?>
```

### 4. تثبيت المكتبات على الخادم

اتصل بالخادم عبر SSH وقم بتشغيل:

```bash
cd /home/YOUR_USERNAME/public_html
npm install --production
```

الخيار `--production` يثبت فقط المكتبات المطلوبة للتشغيل (وليس التطوير).

### 5. إعداد الأذونات

تأكد من أن مجلد `exports` لديه أذونات الكتابة:

```bash
chmod 755 exports/
```

### 6. إعادة تشغيل التطبيق

بعد رفع الملفات، أعد تشغيل التطبيق:

```bash
touch tmp/restart.txt
```

أو من cPanel:
- اذهب إلى **Setup Node.js App**
- اضغط على **Restart**

## استكشاف الأخطاء

### خطأ "Web application could not be started"

**الأسباب الشائعة:**

1. **مجلد dist غير موجود**
   - الحل: قم بتشغيل `npm run build` محلياً ثم ارفع مجلد `dist`

2. **المكتبات غير مثبتة**
   - الحل: قم بتشغيل `npm install --production` على الخادم

3. **مسار PassengerAppRoot خاطئ**
   - الحل: صحح المسار في `.htaccess`

4. **إصدار Node.js قديم**
   - الحل: تأكد من أن Node.js 18 أو أحدث مثبّت

### كيفية عرض سجلات الأخطاء

1. **من cPanel:**
   - اذهب إلى **Setup Node.js App**
   - انقر على اسم التطبيق
   - شاهد السجلات في الأسفل

2. **من SSH:**
   ```bash
   tail -f ~/logs/passenger.log
   ```

### اختبار التطبيق محلياً

قبل الرفع، اختبر التطبيق محلياً:

```bash
# بناء المشروع
npm run build

# تشغيل الإنتاج
npm start
```

افتح المتصفح على: `http://localhost:5000`

## إعدادات Passenger المتقدمة

### زيادة الذاكرة المتاحة

أضف في `.htaccess`:

```apache
PassengerMaxPoolSize 6
PassengerMinInstances 1
```

### تمكين وضع التطوير (لاستكشاف الأخطاء فقط)

```apache
PassengerAppEnv development
PassengerFriendlyErrorPages on
```

**تحذير:** لا تترك هذه الإعدادات في الإنتاج لأسباب أمنية!

## المشاكل الشائعة وحلولها

### 1. الملف لا يتم تنزيله

**السبب:** مجلد `exports` غير موجود أو ليس لديه أذونات كتابة

**الحل:**
```bash
mkdir -p exports
chmod 755 exports
```

### 2. خطأ "Cannot find module"

**السبب:** المكتبات غير مثبتة

**الحل:**
```bash
npm install --production
```

### 3. الصفحة تعمل لكن الـ API لا يعمل

**السبب:** التطبيق لم يبدأ بشكل صحيح

**الحل:**
1. تحقق من السجلات
2. أعد تشغيل التطبيق: `touch tmp/restart.txt`
3. تأكد من أن `app.js` موجود ولديه أذونات تنفيذ

### 4. خطأ "Module not found: dist/index.js"

**السبب:** لم تقم ببناء المشروع

**الحل:**
```bash
npm run build
```

## اختبار ما بعد النشر

1. **اختبار الصفحة الرئيسية:**
   - افتح موقعك في المتصفح
   - يجب أن تظهر الصفحة الرئيسية

2. **اختبار API:**
   - افتح: `https://yoursite.com/api/export/schedule`
   - يجب أن ترى رسالة خطأ أو استجابة JSON (وليس صفحة Passenger)

3. **اختبار التصدير:**
   - اذهب إلى صفحة "جدول الطلبة"
   - أدخل بيانات وهمية
   - اضغط "تصدير إلى Excel"
   - يجب أن يتم تنزيل ملف Excel

## الدعم

إذا واجهت مشاكل:

1. تحقق من السجلات أولاً
2. تأكد من أن جميع الملفات مرفوعة بشكل صحيح
3. تحقق من أذونات الملفات والمجلدات
4. تأكد من أن Node.js يعمل بشكل صحيح على الخادم

---

**ملاحظة:** هذا الدليل مخصص للاستضافة التي تستخدم Phusion Passenger. إذا كنت تستخدم استضافة مختلفة (مثل VPS أو Heroku)، فقد تحتاج إلى خطوات مختلفة.
