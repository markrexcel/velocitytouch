# VelocityTouch Motion Lab — Android app

React + Tailwind app packaged as a real Android app with Capacitor, with Google AdMob ads
(banner + interstitial) and an app icon/splash.

What is real in the app: the touch test measures your screen's actual touch sampling rate,
input delay, jitter and smoothness from real pointer events, and the advisor gives
recommendations from those measurements on the device (no server, no API key).

## 1. Get the APK (no Android Studio needed)

1. Create a free GitHub repo and upload everything in this folder (keep the `.github` folder).
2. Open **Actions > Build Android APK > Run workflow**.
3. When it finishes (about 5–8 min), download **VelocityTouch-debug-apk** and install `app-debug.apk`.

## 2. Turn on your real ads

Until you do this, the app shows Google TEST ads (safe, no earnings).
In your repo go to **Settings > Secrets and variables > Actions > Variables** and add:

| Variable | Value |
|---|---|
| `ADMOB_APP_ID` | your App ID, `ca-app-pub-XXXX~YYYY` |
| `ADMOB_BANNER_ID` | your banner ad unit, `ca-app-pub-XXXX/ZZZZ` |
| `ADMOB_INTERSTITIAL_ID` | your interstitial ad unit |
| `BANNER_POSITION` | `BOTTOM` (default) or `TOP` |

Create these in admob.google.com (add app, then create a Banner and an Interstitial ad unit).
Re-run the workflow. Never click your own live ads.

Ads: one adaptive banner (AdMob allows one banner at a time), and an interstitial after
"Get Recommendations" and when the Share card closes, at most once every 45 seconds.
EU/UK users get the Google consent form automatically.

### Using demo ads first, real ads later

You can publish with the demo (test) ads while AdMob approves your units. They earn nothing and
show a "Test Ad" label. When approved, add the 4 variables above and re-run the workflow, then
upload the new `.aab` as an update. Use the same keystore and package name
(`com.velocitytouch.motionlab`). The version number goes up automatically on every build.

## 3. Publish on Google Play (signed release)

1. Make a keystore once (keep it safe, you need it for every update):
   `keytool -genkey -v -keystore release.jks -alias velocitytouch -keyalg RSA -keysize 2048 -validity 10000`
   (use the same password for the keystore and the key)
2. Add repo **Secrets**: `KEYSTORE_BASE64` (output of `base64 -w0 release.jks`),
   `KEYSTORE_PASSWORD`, `KEY_ALIAS` (`velocitytouch`).
3. Re-run the workflow. Download **VelocityTouch-release-signed**: it has a signed `.apk` and a `.aab`.
   Upload the `.aab` to Play Console.
4. Play requires a privacy policy URL for apps with ads, and the Data safety form
   (declare advertising ID / ads).

## Build locally instead

Needs Node 20+, JDK 21, Android SDK.

```
npm install && npm run build
npx cap add android
npx @capacitor/assets generate --android --iconBackgroundColor '#020617' --splashBackgroundColor '#020617'
ADMOB_APP_ID=ca-app-pub-xxx~yyy python3 scripts/patch-android.py
npx cap sync android
cd android && ./gradlew assembleDebug
```
