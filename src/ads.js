import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  AdMob,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  AdmobConsentStatus,
} from '@capacitor-community/admob';

/* ==================================================================
 * AD CONFIG - all values come from build variables (see README).
 *
 * Provider:
 *   VITE_AD_PROVIDER=meta  + Meta placement IDs  -> Meta Audience Network
 *   anything else                                -> Google AdMob
 *                                                   (Google TEST ads until you add live IDs)
 * Meta has NO universal test ID: you need your own placement IDs from
 * Monetization Manager. Set VITE_META_TEST=true to request Meta test ads.
 * ================================================================== */
const env = import.meta.env;

const META_BANNER = env.VITE_META_BANNER_ID || '';
const META_INTERSTITIAL = env.VITE_META_INTERSTITIAL_ID || '';
const META_TEST = env.VITE_META_TEST === 'true';
const USE_META = env.VITE_AD_PROVIDER === 'meta' && Boolean(META_BANNER && META_INTERSTITIAL);

const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const ADMOB_LIVE = Boolean(env.VITE_ADMOB_BANNER_ID && env.VITE_ADMOB_INTERSTITIAL_ID);
const ADMOB_BANNER_ID = ADMOB_LIVE ? env.VITE_ADMOB_BANNER_ID : TEST_BANNER_ID;
const ADMOB_INTERSTITIAL_ID = ADMOB_LIVE ? env.VITE_ADMOB_INTERSTITIAL_ID : TEST_INTERSTITIAL_ID;

export const BANNER_POSITION = env.VITE_BANNER_POSITION === 'TOP' ? 'TOP' : 'BOTTOM';

// Meta's documented test-ad template is TEST_AD_TYPE#YOUR_PLACEMENT_ID
const metaId = (id, testType) => (META_TEST ? `${testType}#${id}` : id);

/* ------------------------------------------------------------------
 * LOW-DISTRACTION RULES for full-screen ads
 * - never in the first minute after opening the app
 * - at least 90 s between two full-screen ads
 * - at most 4 per app session
 * - never within 5 s of the user touching the test area
 * - only ever triggered by the user's own actions (see App.tsx)
 * ------------------------------------------------------------------ */
const FIRST_AD_DELAY_MS = 60_000;
const COOLDOWN_MS = 90_000;
const MAX_PER_SESSION = 4;
const BUSY_WINDOW_MS = 5_000;
const MAX_LOAD_RETRIES = 4;

const startedAt = Date.now();
let lastShownAt = 0;
let shownCount = 0;
let lastBusyAt = 0;
let ready = false;
let loadRetries = 0;
let started = false;

const MetaAds = registerPlugin('MetaAds');
const isNative = () => Capacitor.isNativePlatform();

/** Call while the user is interacting with the touch test, so no ad appears mid-measurement. */
export function noteUserBusy() {
  lastBusyAt = Date.now();
}

function scheduleRetry(prepare) {
  if (loadRetries >= MAX_LOAD_RETRIES) return;
  loadRetries += 1;
  setTimeout(prepare, 30_000 * loadRetries);
}

/* ------------------------------ Meta ------------------------------ */

async function metaPrepare() {
  try {
    ready = false;
    await MetaAds.prepareInterstitial({
      placementId: metaId(META_INTERSTITIAL, 'CAROUSEL_IMG_SQUARE_APP_INSTALL'),
    });
  } catch (e) {
    console.warn('Meta interstitial prepare failed', e);
    scheduleRetry(metaPrepare);
  }
}

async function initMeta(onBannerHeight) {
  await MetaAds.initialize();

  MetaAds.addListener('bannerSize', (s) => onBannerHeight?.(s?.height || 0));
  MetaAds.addListener('interstitialLoaded', () => {
    ready = true;
    loadRetries = 0;
  });
  MetaAds.addListener('interstitialFailed', () => {
    ready = false;
    scheduleRetry(metaPrepare);
  });
  MetaAds.addListener('interstitialDismissed', () => {
    lastShownAt = Date.now();
    metaPrepare();
  });

  await MetaAds.showBanner({
    placementId: metaId(META_BANNER, 'IMG_16_9_APP_INSTALL'),
    position: BANNER_POSITION,
  });
  await metaPrepare();
}

/* ------------------------------ AdMob ----------------------------- */

async function admobPrepare() {
  try {
    ready = false;
    await AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID, isTesting: !ADMOB_LIVE });
  } catch (e) {
    console.warn('AdMob interstitial prepare failed', e);
    scheduleRetry(admobPrepare);
  }
}

async function initAdMob(onBannerHeight) {
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

  AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => onBannerHeight?.(size?.height || 0));
  AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
    ready = true;
    loadRetries = 0;
  });
  AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    lastShownAt = Date.now();
    admobPrepare();
  });
  AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
    ready = false;
    scheduleRetry(admobPrepare);
  });

  await AdMob.showBanner({
    adId: ADMOB_BANNER_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BANNER_POSITION === 'TOP' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: !ADMOB_LIVE,
  });
  await admobPrepare();
}

/* ------------------------------ public API ------------------------ */

/** Starts the chosen ad network, shows the banner and preloads the interstitial. */
export async function initAds(onBannerHeight) {
  if (!isNative() || started) return;
  started = true;
  try {
    if (USE_META) await initMeta(onBannerHeight);
    else await initAdMob(onBannerHeight);
  } catch (e) {
    // Ads must never break the app
    console.warn('Ad init failed', e);
  }
}

/** Shows a full-screen ad only if every low-distraction rule allows it. Safe to call any time. */
export async function showInterstitial() {
  if (!isNative() || !ready) return;
  const now = Date.now();
  if (now - startedAt < FIRST_AD_DELAY_MS) return;
  if (now - lastShownAt < COOLDOWN_MS) return;
  if (shownCount >= MAX_PER_SESSION) return;
  if (now - lastBusyAt < BUSY_WINDOW_MS) return;

  try {
    ready = false;
    if (USE_META) {
      const res = await MetaAds.showInterstitial();
      if (res?.shown) shownCount += 1;
      else metaPrepare();
    } else {
      await AdMob.showInterstitial();
      shownCount += 1;
    }
  } catch (e) {
    console.warn('Interstitial show failed', e);
    if (USE_META) metaPrepare();
    else admobPrepare();
  }
}
