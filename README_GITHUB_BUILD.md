# RadoVPN - حل مشکل تحریم Gradle

اگر لوکال بیلد نمیگیره:

## راه حل 1: با VPN لوکال بیلد بگیر
1. VPN سیستم را روشن کن (مهم!)
2. در Android Studio: File -> Settings -> Build, Execution, Deployment -> Build Tools -> Gradle
   - تیک Offline Mode را بردار
3. File -> Settings -> Appearance -> HTTP Proxy -> Auto-detect proxy settings
4. File -> Invalidate Caches / Restart
5. دوباره Sync

## راه حل 2: بدون Android Studio، APK را از GitHub بگیر (100% تضمینی)
1. در github.com یک ریپازیتوری جدید بساز
2. تمام فایل های این پوشه را آپلود کن (یا پوشه را درگ کن)
3. برو تب Actions -> خواهی دید Build در حال اجراست (1-2 دقیقه)
4. بعد از سبز شدن، روی build کلیک کن -> پایین صفحه Artifacts -> RadoVPN-debug-apk را دانلود کن
5. داخلش app-debug.apk هست - مستقیم روی گوشی نصب کن

این روش نیاز به هیچ VPN یا Android Studio ندارد.
