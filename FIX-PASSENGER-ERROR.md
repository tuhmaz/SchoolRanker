# إصلاح خطأ Passenger: "Web application could not be started"

## المشكلة

عند الضغط على "إنشاء ملف السجل"، يظهر خطأ Passenger:
```
We're sorry, but something went wrong.
Web application could not be started by the Phusion Passenger(R) application server.
```

## السبب

التطبيق هو تطبيق **Node.js Full-Stack** (Frontend + Backend)، لكن الخادم (Passenger) لم يكن مُعدّاً بشكل صحيح للتعامل مع تطبيقات Node.js.

## الحل

تم إنشاء الملفات التالية لإصلاح المشكلة:

### 1. ملف `app.js` (نقطة البداية)
هذا الملف هو نقطة دخول التطبيق التي يستخدمها Passenger لتشغيل التطبيق.

### 2. ملف `.passengerrc.json` (إعدادات Passenger)
يحتوي على إعدادات Passenger الخاصة بـ Node.js.

### 3. ملف `.htaccess` (تم تحديثه)
تم تحديثه ليُخبر Apache أن هذا تطبيق Node.js وليس تطبيق Ruby أو Python.

### 4. ملف `DEPLOYMENT.md` (دليل النشر الكامل)
يحتوي على تعليمات مفصلة لنشر التطبيق على الاستضافة.

## خطوات الإصلاح السريعة

### إذا كنت تعمل محلياً (على جهازك):

```bash
# 1. بناء المشروع
npm install
npm run build

# 2. تشغيل المشروع محلياً
npm start

# افتح المتصفح على: http://localhost:5000
```

### إذا كنت تريد رفعه على الاستضافة:

1. **قم ببناء المشروع محلياً:**
   ```bash
   npm install
   npm run build
   ```

2. **ارفع هذه الملفات إلى الاستضافة:**
   - `app.js`
   - `.htaccess` (المحدّث)
   - `.passengerrc.json`
   - `package.json`
   - `package-lock.json`
   - مجلد `dist/` (كامل)
   - مجلد `templates/` (كامل)
   - مجلد `node_modules/` (أو شغّل `npm install` على الخادم)

3. **حدّث المسار في `.htaccess`:**

   افتح ملف `.htaccess` وغيّر هذا السطر:
   ```apache
   PassengerAppRoot /home/username/public_html
   ```

   استبدل `/home/username/public_html` بالمسار الكامل لمجلدك على الاستضافة.

   **كيف تعرف المسار الصحيح؟**

   أنشئ ملف PHP اسمه `path.php` في مجلدك:
   ```php
   <?php echo __DIR__; ?>
   ```

   افتحه في المتصفح، سيظهر لك المسار الكامل.

4. **ثبّت المكتبات على الخادم (عبر SSH):**
   ```bash
   cd /home/username/public_html
   npm install --production
   ```

5. **تأكد من أن مجلد exports له أذونات الكتابة:**
   ```bash
   mkdir -p exports
   chmod 755 exports
   ```

6. **أعد تشغيل التطبيق:**

   **من cPanel:**
   - اذهب إلى "Setup Node.js App"
   - اضغط "Restart"

   **من SSH:**
   ```bash
   touch tmp/restart.txt
   ```

## التحقق من نجاح الإصلاح

1. افتح موقعك في المتصفح
2. اذهب إلى صفحة "جدول الطلبة و مجموع الغياب"
3. اختر فصلاً وأدخل بيانات الغياب
4. اضغط "تصدير إلى Excel"
5. يجب أن يتم تنزيل ملف Excel بنجاح!

## إذا استمرت المشكلة

راجع ملف [DEPLOYMENT.md](./DEPLOYMENT.md) للحصول على تعليمات أكثر تفصيلاً واستكشاف الأخطاء.

### كيفية عرض السجلات (Logs)

**من cPanel:**
1. اذهب إلى "Setup Node.js App"
2. اضغط على اسم التطبيق
3. انظر للأسفل لرؤية السجلات

**من SSH:**
```bash
tail -f ~/logs/passenger.log
```

## الملفات المهمة

- `app.js` - نقطة دخول التطبيق
- `.htaccess` - إعدادات الخادم
- `.passengerrc.json` - إعدادات Passenger
- `dist/index.js` - كود الخادم المجمّع
- `dist/public/` - ملفات الواجهة الأمامية
- `templates/Student_schedule.xlsx` - قالب Excel للجدول
- `exports/` - مجلد تخزين الملفات المُصدّرة

## ملاحظات مهمة

1. **لا تنسَ بناء المشروع قبل الرفع:**
   ```bash
   npm run build
   ```

2. **تأكد من وجود Node.js 18 أو أحدث على الاستضافة**

3. **مجلد `exports` يجب أن يكون قابلاً للكتابة**

4. **إذا كنت تستخدم cPanel، تأكد من تفعيل Node.js للنطاق الخاص بك**

---

**تم إنشاء هذا الإصلاح بواسطة Claude Code 🤖**

إذا نجح الإصلاح، يمكنك حذف هذا الملف.
