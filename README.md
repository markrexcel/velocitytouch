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

## 2. Ads (Meta Audience Network or Google AdMob)

The app has one banner (bottom by default) and a full-screen ad, from either network.
Set these in your GitHub repo: **Settings > Secrets and variables > Actions > Variables**, then re-run the workflow.

**Option A - Meta Audience Network**

| Variable | Value |
|---|---|
| `AD_PROVIDER` | `meta` |
| `META_BANNER_ID` | your banner placement ID, like `1234567890_1234567890` |
| `META_INTERSTITIAL_ID` | your interstitial placement ID |
| `META_TEST` | `true` while testing (Meta test ads), remove or `false` for live |

Meta has no shared test ID: get your own placement IDs from Meta Monetization Manager first.
If `AD_PROVIDER` is `meta` but an ID is missing, the app falls back to AdMob test ads.

**Option B - Google AdMob** (default)

| Variable | Value |
|---|---|
| `ADMOB_APP_ID` | `ca-app-pub-XXXX~YYYY` |
| `ADMOB_BANNER_ID` | `ca-app-pub-XXXX/ZZZZ` |
| `ADMOB_INTERSTITIAL_ID` | your interstitial ad unit |

With none of these set you get Google TEST ads (safe, no earnings).
Optional for both: `BANNER_POSITION` = `TOP` or `BOTTOM` (default).

**How the full-screen ad avoids annoying users** (rules in `src/ads.js`):
never in the first minute, at least 90 s apart, at most 4 per session, never within 5 s of the user touching
the test area, and only after the user's own action (closing the Share card, or resetting a finished test).
It never appears while reading results.

Note: using Meta needs Android 7.0 (API 24) or newer, so the build sets `minSdkVersion` to 24.
Never click your own live ads.

### Using demo ads first, real ads later

Publish with test ads while your ad accounts get approved. Later add the variables above, re-run the
workflow and upload the new `.aab` as an update (same keystore and package name
`com.velocitytouch.motionlab`). The version number goes up automatically on every build.

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
