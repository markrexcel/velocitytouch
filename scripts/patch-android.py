#!/usr/bin/env python3
"""
Patches the freshly generated Capacitor Android project (run after `npx cap add android`):
  - AdMob App ID + ad permissions in AndroidManifest.xml
  - Meta Audience Network SDK dependency, minSdk 24 (Meta requires API 24+)
  - copies the native Meta ads plugin and MainActivity (package name filled in automatically)
  - Play Store versionCode from the build number
Safe to run more than once.
"""
import os
import pathlib
import re
import sys

ROOT = pathlib.Path("android")
APP = ROOT / "app"
manifest = APP / "src/main/AndroidManifest.xml"
app_gradle = APP / "build.gradle"
variables_gradle = ROOT / "variables.gradle"

ADMOB_APP_ID = os.environ.get("ADMOB_APP_ID") or "ca-app-pub-3940256099942544~3347511713"  # Google TEST app ID
META_SDK = "implementation 'com.facebook.android:audience-network-sdk:6.+'"

if not manifest.exists():
    sys.exit("android project not found - run `npx cap add android` first")

# ---------------------------------------------------------------- manifest
text = manifest.read_text()

if "com.google.android.gms.ads.APPLICATION_ID" not in text:
    meta = (
        '        <meta-data\n'
        '            android:name="com.google.android.gms.ads.APPLICATION_ID"\n'
        f'            android:value="{ADMOB_APP_ID}"/>\n'
    )
    text = text.replace("</application>", meta + "    </application>", 1)

for perm in (
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "com.google.android.gms.permission.AD_ID",  # advertising ID, needed on Android 13+
):
    if perm not in text:
        text = text.replace("</manifest>", f'    <uses-permission android:name="{perm}" />\n</manifest>', 1)

manifest.write_text(text)
print("AndroidManifest.xml patched")

# ------------------------------------------------------------ gradle files
g = app_gradle.read_text()

if "audience-network-sdk" not in g:
    new_g, n = re.subn(r"(dependencies\s*\{)", r"\1\n    " + META_SDK, g, count=1)
    if n != 1:
        sys.exit("could not find the dependencies block in android/app/build.gradle")
    g = new_g
    print("Meta Audience Network SDK added")

version_code = os.environ.get("VERSION_CODE")
if version_code:
    g = re.sub(r"versionCode\s+\d+", f"versionCode {int(version_code)}", g, count=1)
    print(f"versionCode set to {int(version_code)}")

app_gradle.write_text(g)

# Meta SDK needs API 24+; Capacitor's default minSdk is lower.
if variables_gradle.exists():
    v = variables_gradle.read_text()

    def bump(match):
        return f"{match.group(1)}{max(24, int(match.group(2)))}"

    v2 = re.sub(r"(minSdkVersion\s*=\s*)(\d+)", bump, v, count=1)
    variables_gradle.write_text(v2)
    print("minSdkVersion is now", re.search(r"minSdkVersion\s*=\s*(\d+)", v2).group(1))
else:
    sys.exit("android/variables.gradle not found - cannot set minSdkVersion 24")

# ---------------------------------------------------- native plugin files
package = None
m = re.search(r"namespace\s*=?\s*[\"']([\w.]+)[\"']", g)
if m:
    package = m.group(1)
if not package:
    m = re.search(r'package="([\w.]+)"', manifest.read_text())
    package = m.group(1) if m else None
if not package:
    cfg = pathlib.Path("capacitor.config.ts")
    m = re.search(r"appId:\s*['\"]([\w.]+)['\"]", cfg.read_text()) if cfg.exists() else None
    package = m.group(1) if m else None
if not package:
    sys.exit("could not work out the app package name")

dest = APP / "src/main/java" / pathlib.Path(*package.split("."))
dest.mkdir(parents=True, exist_ok=True)
for name in ("MetaAdsPlugin.java", "MainActivity.java"):
    src = pathlib.Path("native") / name
    (dest / name).write_text(src.read_text().replace("__PACKAGE__", package))
print(f"Native Meta ads plugin installed in package {package}")
