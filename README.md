# تضاريس مصر — خريطة تفاعلية

خريطة تفاعلية لتضاريس مصر (8 مواقع): صور وبانوراما وشرح صوتي (سلمى / شاكر) ومعلومات سريعة، وتعمل **بدون إنترنت** بعد أول زيارة.

## التشغيل والنشر
الموقع ملفات ثابتة، فلا يحتاج خادمًا:
1. ارفع محتويات هذا المجلد إلى الريبو (الجذر).
2. من **Settings ← Pages** اختر الفرع `main` والمجلد `/ (root)`.
3. افتح الرابط من الموبايل واختر **إضافة إلى الشاشة الرئيسية** ليعمل كتطبيق.

> لا تفتح `index.html` مباشرة من الجهاز (`file://`): المتصفح يمنع تحميل ملفات البيانات والـ Service Worker.

## الهيكل
```
index.html            الصفحة (هيكل فقط)
js/app.js             منطق الخريطة
css/                  التنسيق والخطوط
data/features.json    بيانات المواقع (النص والحقائق والإحداثيات والمصادر)
data/egypt-ring.json  حدود مصر
assets/img, audio     الصور (WebP) والصوت (MP3)
assets/relief.webp    خريطة تضاريس محلية تعمل بدون إنترنت
vendor/               Leaflet و Pannellum
sw.js                 العمل بدون إنترنت (يتغير رقم إصداره مع أي تعديل)
```

## إضافة موقع جديد
1. أضف صورة في `assets/img/` وملفي صوت في `assets/audio/`.
2. أضف عنصرًا جديدًا في `data/features.json` بنفس حقول العناصر الموجودة (`mode` إما `image` أو `panorama`).
3. حدّث قائمتي `CORE`/`MEDIA` ورقم `VERSION` في `sw.js` ليصل التحديث للمستخدمين.

## ملاحظات
- صوت «شاكر» لموقع سيوة كان مقطوعًا في الملف الأصلي (أقل من ثانيتين) فتم إيقافه، ويُشغَّل صوت «سلمى» بدلًا منه. للإصلاح: ولّد الملف من جديد بنفس النص بـ `edge-tts` (الصوت `ar-EG-ShakirNeural`) وضعه في `assets/audio/siwa-shakir.mp3` وغيّر المسار في `features.json`.
- روابط Street View تفتح في Google Maps ولا تُدمج داخل الصفحة (الرابط المدمج القديم غير موثّق وقد يتوقف).
- خريطة الأساس والقمر الصناعي من Esri وتحتاج إنترنت؛ بدونها تظهر الخريطة المحلية المبسّطة.

## المصادر والتراخيص
| الموقع | الصورة | المصوّر | الترخيص |
|---|---|---|---|
| النيل | [Aswan Nile Panorama R01.jpg](https://commons.wikimedia.org/wiki/File:Aswan_Nile_Panorama_R01.jpg) | Marc Ryckaert | CC BY 3.0 |
| الدلتا | [Nile River Delta (MODIS 2024-07-23).jpg](https://commons.wikimedia.org/wiki/File:Nile_River_Delta_(MODIS_2024-07-23).jpg) | MODIS Land Rapid Response Team, NASA GSFC | Public domain |
| سيناء | [Panorama Mount Sinai south.jpg](https://commons.wikimedia.org/wiki/File:Panorama_Mount_Sinai_south.jpg) | Florian Prischl | CC BY-SA 3.0 |
| الصحراء البيضاء | [White Desert, Egypt.jpg](https://commons.wikimedia.org/wiki/File:White_Desert,_Egypt.jpg) | Vyacheslav Argenberg | CC BY 4.0 |
| الصحراء الشرقية | [Eastern Desert peaks.jpg](https://commons.wikimedia.org/wiki/File:Eastern_Desert_peaks.jpg) | غير مذكور في ويكيميديا | Public domain |
| البحر الأحمر | [Red Sea Hurghada R05.jpg](https://commons.wikimedia.org/wiki/File:Red_Sea_Hurghada_R05.jpg) | Marc Ryckaert | CC BY-SA 4.0 |
| سيوة | [Siwa Salt pools07.jpg](https://commons.wikimedia.org/wiki/File:Siwa_Salt_pools07.jpg) | ولاء | Public domain |
| القطارة | [Qattara Depression R02.jpg](https://commons.wikimedia.org/wiki/File:Qattara_Depression_R02.jpg) | Marc Ryckaert | CC BY-SA 4.0 |

- خريطة الأساس: Esri World Shaded Relief و World Imagery (Esri, USGS, NOAA, Maxar وآخرون).
- الخريطة المحلية: Terrain Tiles on AWS (Mapzen/Tilezen) — بيانات SRTM و GMTED2010 (USGS) و ETOPO1 (NOAA).
- حدود مصر: Natural Earth (ملكية عامة).
- Leaflet 1.9.4 (BSD) · Pannellum 2.5.6 (MIT) · خط Cairo (OFL).
- الصوت مولَّد بالذكاء الاصطناعي: Microsoft Edge neural TTS.
- الصور المرخّصة CC BY / CC BY-SA يلزم الإبقاء على الإسناد أعلاه عند إعادة النشر.
