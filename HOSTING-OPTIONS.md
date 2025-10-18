# خيارات الاستضافة لتطبيق SchoolRanker

## المشكلة الحالية

تطبيق SchoolRanker هو تطبيق **Full-Stack** يحتاج إلى:
- **Frontend (الواجهة)**: HTML, CSS, JavaScript - يمكن استضافته في أي مكان
- **Backend (الخادم)**: Node.js Express - يحتاج استضافة خاصة

**المشكلة:** استضافتك الحالية (khadmatak.com) تعطي خطأ 500، مما يعني أنها على الأرجح:
1. لا تدعم Node.js
2. أو تدعم Node.js لكن غير مُعدّة بشكل صحيح

---

## الحلول المتاحة

### ✅ الحل 1: استضافة مجانية على Render.com (موصى به)

**المميزات:**
- مجاني بالكامل ✓
- يدعم Node.js ✓
- سهل الإعداد ✓
- SSL مجاني ✓

**الخطوات:**

1. **اذهب إلى:** https://render.com
2. **سجّل حساب** باستخدام GitHub
3. **ارفع الكود على GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

4. **في Render:**
   - اضغط "New +" → "Web Service"
   - اختر المستودع من GitHub
   - اسم الخدمة: `schoolranker`
   - البيئة: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - اضغط "Create Web Service"

5. **انتظر 5-10 دقائق** حتى يتم النشر

6. **احصل على رابط الموقع** مثل: `https://schoolranker.onrender.com`

---

### ✅ الحل 2: استضافة مجانية على Railway.app

**المميزات:**
- مجاني (مع 500 ساعة/شهر) ✓
- أسرع من Render ✓
- سهل جداً ✓

**الخطوات:**

1. **اذهب إلى:** https://railway.app
2. **سجّل حساب** باستخدام GitHub
3. **ارفع الكود على GitHub** (نفس الخطوات أعلاه)
4. **في Railway:**
   - اضغط "New Project"
   - اختر "Deploy from GitHub repo"
   - اختر المستودع
   - Railway سيكتشف أنه مشروع Node.js تلقائياً
5. **عدّل Settings:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. **احصل على النطاق المجاني** من Settings

---

### ✅ الحل 3: cPanel مع دعم Node.js

**إذا كانت استضافتك تدعم Node.js** (بعض استضافات cPanel تدعمه):

**تحقق أولاً:**
1. افتح cPanel
2. ابحث عن "Setup Node.js App" أو "Node.js Selector"
3. إذا وجدته، استضافتك تدعم Node.js!

**خطوات الإعداد:**

1. **في cPanel → Setup Node.js App:**
   - اضغط "Create Application"
   - Node.js version: اختر 18 أو أحدث
   - Application mode: `Production`
   - Application root: `/home/username/public_html` (أو المسار الرئيسي)
   - Application URL: اختر النطاق الخاص بك
   - Application startup file: `app.js`
   - اضغط "Create"

2. **ارفع الملفات:**
   - ارفع كل الملفات إلى المسار الذي حددته
   - تأكد من رفع مجلد `dist/` و `templates/`

3. **في Terminal (SSH أو cPanel Terminal):**
   ```bash
   cd ~/public_html
   npm install --production
   ```

4. **في cPanel → Setup Node.js App:**
   - اضغط على اسم التطبيق
   - انسخ أمر "Enter to the virtual environment"
   - الصقه في Terminal
   - ثم شغّل: `npm start`

5. **أعد تشغيل التطبيق** من cPanel

---

### ✅ الحل 4: Vercel (للواجهة فقط - Static)

إذا أردت حل سريع مؤقت، يمكنك استضافة الواجهة فقط على Vercel:

**لكن:** لن تعمل ميزة التصدير إلى Excel (لأن الـ API غير موجود)

**الخطوات:**
1. اذهب إلى: https://vercel.com
2. سجّل باستخدام GitHub
3. ارفع الكود على GitHub
4. اختر المستودع في Vercel
5. Vercel سيكتشف أنه مشروع Vite تلقائياً
6. اضغط Deploy

---

## أيهما أختار؟

### للاستخدام الكامل (موصى به):
- **الخيار الأفضل:** Render.com (مجاني ويعمل 100%)
- **الخيار الأسرع:** Railway.app (مجاني لكن محدود)

### إذا كانت استضافتك الحالية تدعم Node.js:
- **استخدم:** cPanel مع Node.js (الخيار 3)

---

## كيف تعرف إذا كانت استضافتك تدعم Node.js؟

**اتصل بدعم الاستضافة** واسألهم:
> "هل استضافتكم تدعم تطبيقات Node.js؟ أريد تشغيل تطبيق Express.js"

إذا قالوا **نعم**، اطلب منهم:
1. تفعيل Node.js للنطاق الخاص بك
2. مسار الـ Node.js executable (عادة `/usr/bin/node`)
3. كيفية إعداد التطبيق

---

## الخطة الموصى بها

### للبداية السريعة (10 دقائق):

1. **استخدم Render.com** (مجاني ومضمون)
   - اتبع خطوات "الحل 1" أعلاه
   - ارفع الكود على GitHub
   - انشر على Render
   - احصل على رابط مثل: `https://schoolranker.onrender.com`

### لاحقاً (إذا أردت نطاق خاص):

1. **اشترِ استضافة VPS** (5-10$/شهر) مثل:
   - DigitalOcean
   - Linode
   - Vultr

2. **أو استخدم استضافة Node.js** مخصصة مثل:
   - Heroku (مدفوع)
   - Railway (مجاني محدود)
   - Render (مجاني)

---

## الملفات المطلوبة لكل خيار

### Render.com أو Railway:
- لا تحتاج ملفات إضافية
- `package.json` كافي

### cPanel:
- تحتاج: `app.js`, `.htaccess` مع إعدادات Passenger

### Vercel (Static فقط):
- `vercel.json` موجود بالفعل

---

## الدعم

إذا احتجت مساعدة:

1. **اتبع التعليمات في `FIX-PASSENGER-ERROR.md`** للاستضافات التي تدعم Passenger
2. **اتبع هذا الملف** لخيارات الاستضافة الأخرى
3. **اختبر محلياً أولاً:** `npm run build && npm start`

---

**ملاحظة:** إذا كانت استضافتك الحالية (khadmatak.com) لا تدعم Node.js،
يجب عليك استخدام أحد الحلول المذكورة أعلاه. **لا يمكن تشغيل تطبيق Node.js
على استضافة لا تدعم Node.js!**
