# APK کیسے حاصل کریں

اس فولڈر میں مکمل اینڈرائیڈ پروجیکٹ تیار ہے۔ APK بنانے کے تین طریقے ہیں —
آسان ترین **طریقہ ۱** ہے، اس میں کچھ بھی انسٹال نہیں کرنا پڑتا۔

---

## طریقہ ۱ — GitHub پر خودکار بلڈ (کچھ انسٹال نہیں کرنا) ⭐

1. GitHub پر ایک نیا **repository** بنائیں (public یا private، دونوں مفت)
2. اس فولڈر کی ساری فائلیں وہاں اپلوڈ کر دیں
   (ویب سائٹ پر "Add file ▸ Upload files" سے بھی ہو سکتا ہے)
3. repository میں **Actions** ٹیب کھولیں ▸ **Build APK** ▸ **Run workflow**
4. تقریباً 5 منٹ بعد صفحہ کھولیں ▸ نیچے **Artifacts** میں
   `noor-e-hidayat-apk` ملے گی ▸ ڈاؤن لوڈ کریں

بس۔ زپ کھولیں، اندر `app-debug.apk` ہے — فون میں ڈال کر انسٹال کر لیں۔

> فون پر انسٹال کرتے وقت "Install from unknown sources" کی اجازت دینی ہوگی۔

---

## طریقہ ۲ — اپنے کمپیوٹر پر

```bash
npm install
npx cap sync android
cd android
./gradlew assembleDebug
```

APK یہاں بنے گی:
`android/app/build/outputs/apk/debug/app-debug.apk`

ضرورت: **Java 21** اور **Android SDK** (Android Studio کے ساتھ آ جاتا ہے)

---

## طریقہ ۳ — بغیر APK کے (سب سے تیز)

`www/index.html` کو کسی بھی مفت ہوسٹنگ پر ڈال دیں (Netlify / Vercel / GitHub Pages)۔
پھر فون کے Chrome میں کھول کر مینو سے **"Add to Home screen"** دبا دیں۔
ایپ جیسی ہی چلے گی — بس پس منظر والی اذان نہیں بجے گی۔

---

# Play Store پر ڈالنے سے پہلے

اوپر والی APK **debug** ہے — ذاتی استعمال اور دوستوں میں بانٹنے کے لیے ٹھیک ہے،
مگر Play Store کے لیے **signed release** چاہیے:

```bash
keytool -genkey -v -keystore noor.keystore -alias noor \
        -keyalg RSA -keysize 2048 -validity 10000

cd android
./gradlew bundleRelease
```

`noor.keystore` فائل کبھی نہ کھوئیں — اس کے بغیر ایپ کا اپڈیٹ کبھی نہیں دے سکیں گے۔

---

# جو کام آپ کو خود کرنے ہیں

### ۱. اصل اذان کی آواز ⚠️
`android/app/src/main/res/raw/adhan.wav` میں فی الحال ایک سادہ سی گھنٹی ہے۔
اسے اصل اذان سے بدل دیں:
- نام بالکل یہی رکھیں: `adhan.wav` (چھوٹے حروف، کوئی ڈیش یا سپیس نہیں)
- دورانیہ **30 سیکنڈ سے کم** — اینڈرائیڈ اس سے لمبی آواز خود کاٹ دیتا ہے
- کوئی بھی مفت/اجازت شدہ اذان کی ریکارڈنگ استعمال کریں

### ۲. ایپ کا آئیکن
`android/app/src/main/res/mipmap-*/` میں فی الحال Capacitor کا ڈیفالٹ آئیکن ہے۔
Android Studio میں: **right-click res ▸ New ▸ Image Asset**

### ۳. فونٹس آف لائن کریں
`www/index.html` ابھی Google Fonts سے فونٹ لیتی ہے۔ انٹرنیٹ کے بغیر عربی/اردو
صحیح دکھانے کے لیے Amiri اور Noto Nastaliq Urdu ڈاؤن لوڈ کر کے `www/fonts/`
میں رکھیں اور `<link>` کی جگہ `@font-face` لکھ دیں۔

---

# انسٹال کے بعد فون میں یہ ضرور کریں

الارم نہ بجنے کی 90% وجہ یہی تین باتیں ہوتی ہیں:

1. ایپ کھولتے ہی **مقام** اور **اطلاعات** دونوں کی اجازت دیں
2. اینڈرائیڈ 12+ پر "عین وقت پر الارم" کی اسکرین کھلے گی — اسے **آن** کریں
3. **Settings ▸ Battery ▸ نورِ ہدایت ▸ Unrestricted**
   (Xiaomi، Oppo، Vivo، Realme، Samsung پر یہ لازمی ہے)

آزمانے کے لیے: فون کا وقت اگلی نماز سے 2 منٹ پہلے کر دیں اور ایپ بند کر دیں۔
