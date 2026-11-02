#!/usr/bin/env python3
"""Adds the AdMob App ID (and ad-related permissions) to the generated Android manifest."""
import os
import pathlib
import sys

# Uses your AdMob App ID from the ADMOB_APP_ID build variable; falls back to Google's TEST app ID.
ADMOB_APP_ID = os.environ.get("ADMOB_APP_ID") or "ca-app-pub-3940256099942544~3347511713"

manifest = pathlib.Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    sys.exit("android/app/src/main/AndroidManifest.xml not found - run `npx cap add android` first")

text = manifest.read_text()

if "com.google.android.gms.ads.APPLICATION_ID" not in text:
    meta = (
        '        <meta-data\n'
        '            android:name="com.google.android.gms.ads.APPLICATION_ID"\n'
        f'            android:value="{ADMOB_APP_ID}"/>\n'
    )
    text = text.replace("</application>", meta + "    </application>", 1)

for perm in ("android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"):
    if perm not in text:
        text = text.replace("</manifest>", f'    <uses-permission android:name="{perm}" />\n</manifest>', 1)

manifest.write_text(text)
print("AndroidManifest.xml patched")

# Play Store only accepts an update if versionCode goes up, so use the build number.
version_code = os.environ.get("VERSION_CODE")
gradle = pathlib.Path("android/app/build.gradle")
if version_code and gradle.exists():
    import re
    g = gradle.read_text()
    g = re.sub(r"versionCode\s+\d+", f"versionCode {int(version_code)}", g, count=1)
    gradle.write_text(g)
    print(f"versionCode set to {int(version_code)}")
