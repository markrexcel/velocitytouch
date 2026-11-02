import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  AdmobConsentStatus,
} from '@capacitor-community/admob';

/* ------------------------------------------------------------------
 * AD CONFIG - comes from build variables (see README), no code edits.
 * If the live IDs are not set, Google's official TEST ads are used so
 * you never risk your AdMob account while testing.
 * ------------------------------------------------------------------ */
const env = import.meta.env;
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

const LIVE = Boolean(env.VITE_ADMOB_BANNER_ID && env.VITE_ADMOB_INTERSTITIAL_ID);
export const USE_TEST_ADS = !LIVE;
export const BANNER_POSITION = env.VITE_BANNER_POSITION === 'TOP' ? 'TOP' : 'BOTTOM';

const BANNER_ID = LIVE ? env.VITE_ADMOB_BANNER_ID : TEST_BANNER_ID;
const INTERSTITIAL_ID = LIVE ? env.VITE_ADMOB_INTERSTITIAL_ID : TEST_INTERSTITIAL_ID;

const INTERSTITIAL_COOLDOWN_MS = 45_000;

let interstitialReady = false;
let lastInterstitialAt = 0;
let started = false;

const isNative = () => Capacitor.isNativePlatform();

async function prepareInterstitial() {
  try {
    interstitialReady = false;
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: USE_TEST_ADS });
  } catch (e) {
    console.warn('Interstitial prepare failed', e);
  }
}

/** Starts AdMob, shows the banner and preloads the interstitial. */
export async function initAds(onBannerHeight) {
  if (!isNative() || started) return;
  started = true;

  try {
    await AdMob.initialize({});

    // GDPR / UMP consent (needed for EU users; harmless elsewhere)
    try {
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
    } catch (e) {
      console.warn('Consent flow skipped', e);
    }

    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
      onBannerHeight?.(size?.height || 0);
    });
    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      interstitialReady = true;
    });
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      lastInterstitialAt = Date.now();
      prepareInterstitial();
    });
    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
      interstitialReady = false;
      setTimeout(prepareInterstitial, 30_000);
    });

    await AdMob.showBanner({
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BANNER_POSITION === 'TOP' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: USE_TEST_ADS,
    });

    await prepareInterstitial();
  } catch (e) {
    console.warn('AdMob init failed', e);
  }
}

/** Shows a full-screen ad if one is loaded and the cooldown has passed. */
export async function showInterstitial() {
  if (!isNative() || !interstitialReady) return;
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;
  try {
    await AdMob.showInterstitial();
  } catch (e) {
    console.warn('Interstitial show failed', e);
    prepareInterstitial();
  }
}
