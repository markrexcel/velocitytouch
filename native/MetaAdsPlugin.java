package com.velocitytouch.motionlab;

import android.app.Activity;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import android.app.Activity;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.facebook.ads.Ad;
import com.facebook.ads.AdError;
import com.facebook.ads.AdSize;
import com.facebook.ads.AdView;
import com.facebook.ads.AudienceNetworkAds;
import com.facebook.ads.InterstitialAd;
import com.facebook.ads.InterstitialAdListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Meta Audience Network for Capacitor: one banner (top or bottom) and one interstitial.
 * Interstitials are never shown automatically - JS decides when (see src/ads.js).
 */
@CapacitorPlugin(name = "MetaAds")
public class MetaAdsPlugin extends Plugin {

    private boolean initialized = false;

    private FrameLayout bannerContainer;
    private AdView bannerView;
    private boolean bannerAtTop = false;

    private InterstitialAd interstitial;

    // ------------------------------------------------------------------ init

    @PluginMethod
    public void initialize(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (!initialized) {
                        AudienceNetworkAds.initialize(activity.getApplicationContext());
                        initialized = true;
                    }
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Meta init failed: " + e.getMessage());
                }
            }
        });
    }

    // ---------------------------------------------------------------- banner

    @PluginMethod
    public void showBanner(final PluginCall call) {
        final String placementId = call.getString("placementId");
        final String position = call.getString("position", "BOTTOM");
        final Activity activity = getActivity();
        if (activity == null || placementId == null || placementId.isEmpty()) {
            call.reject("Missing activity or placementId");
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    removeBannerInternal();
                    bannerAtTop = "TOP".equals(position);

                    final FrameLayout root = activity.findViewById(android.R.id.content);
                    bannerContainer = new FrameLayout(activity);
                    bannerView = new AdView(activity, placementId, AdSize.BANNER_HEIGHT_50);
                    bannerContainer.addView(bannerView, new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

                    FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                    lp.gravity = (bannerAtTop ? Gravity.TOP : Gravity.BOTTOM) | Gravity.CENTER_HORIZONTAL;
                    root.addView(bannerContainer, lp);

                    // Keep the banner clear of the status / gesture bar. If the system already
                    // handled the insets (non edge-to-edge) the value is 0, so it never double-pads.
                    ViewCompat.setOnApplyWindowInsetsListener(bannerContainer,
                            new androidx.core.view.OnApplyWindowInsetsListener() {
                                @Override
                                public WindowInsetsCompat onApplyWindowInsets(android.view.View v, WindowInsetsCompat insets) {
                                    Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                                    applyBannerMargin(bannerAtTop ? bars.top : bars.bottom);
                                    return insets;
                                }
                            });
                    ViewCompat.requestApplyInsets(bannerContainer);

                    bannerView.loadAd();
                    reportBannerSize(0);
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Banner failed: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void hideBanner(final PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                removeBannerInternal();
                JSObject o = new JSObject();
                o.put("height", 0);
                notifyListeners("bannerSize", o);
                call.resolve();
            }
        });
    }

    private void applyBannerMargin(int insetPx) {
        if (bannerContainer == null) return;
        ViewGroup.LayoutParams raw = bannerContainer.getLayoutParams();
        if (!(raw instanceof FrameLayout.LayoutParams)) return;
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) raw;
        if (bannerAtTop) lp.topMargin = insetPx; else lp.bottomMargin = insetPx;
        bannerContainer.setLayoutParams(lp);
        reportBannerSize(insetPx);
    }

    /** Reports banner height in CSS px (= dp in a WebView) so the page can leave room for it. */
    private void reportBannerSize(int insetPx) {
        float density = getContext().getResources().getDisplayMetrics().density;
        int heightDp = Math.round(50 + insetPx / density);
        JSObject o = new JSObject();
        o.put("height", heightDp);
        notifyListeners("bannerSize", o);
    }

    private void removeBannerInternal() {
        if (bannerView != null) {
            bannerView.destroy();
            bannerView = null;
        }
        if (bannerContainer != null) {
            ViewGroup parent = (ViewGroup) bannerContainer.getParent();
            if (parent != null) parent.removeView(bannerContainer);
            bannerContainer = null;
        }
    }

    // ----------------------------------------------------------- interstitial

    @PluginMethod
    public void prepareInterstitial(final PluginCall call) {
        final String placementId = call.getString("placementId");
        final Activity activity = getActivity();
        if (activity == null || placementId == null || placementId.isEmpty()) {
            call.reject("Missing activity or placementId");
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (interstitial != null) {
                        interstitial.destroy();
                        interstitial = null;
                    }
                    final InterstitialAd ad = new InterstitialAd(activity, placementId);
                    interstitial = ad;

                    InterstitialAdListener listener = new InterstitialAdListener() {
                        @Override
                        public void onInterstitialDisplayed(Ad a) {
                        }

                        @Override
                        public void onInterstitialDismissed(Ad a) {
                            notifyListeners("interstitialDismissed", new JSObject());
                        }

                        @Override
                        public void onError(Ad a, AdError error) {
                            JSObject o = new JSObject();
                            o.put("message", error == null ? "unknown" : error.getErrorMessage());
                            notifyListeners("interstitialFailed", o);
                        }

                        @Override
                        public void onAdLoaded(Ad a) {
                            // Deliberately NOT shown here: JS shows it at a calm moment.
                            notifyListeners("interstitialLoaded", new JSObject());
                        }

                        @Override
                        public void onAdClicked(Ad a) {
                        }

                        @Override
                        public void onLoggingImpression(Ad a) {
                        }
                    };

                    ad.loadAd(ad.buildLoadAdConfig().withAdListener(listener).build());
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Interstitial prepare failed: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void showInterstitial(final PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                JSObject o = new JSObject();
                boolean shown = false;
                try {
                    // Meta only pays for valid ads: never show an invalidated (expired) one
                    if (interstitial != null && interstitial.isAdLoaded() && !interstitial.isAdInvalidated()) {
                        interstitial.show();
                        shown = true;
                    }
                } catch (Exception e) {
                    shown = false;
                }
                o.put("shown", shown);
                call.resolve(o);
            }
        });
    }

    // -------------------------------------------------------------- lifecycle

    @Override
    protected void handleOnDestroy() {
        removeBannerInternal();
        if (interstitial != null) {
            interstitial.destroy();
            interstitial = null;
        }
        super.handleOnDestroy();
    }
}
