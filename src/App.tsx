import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Activity, 
  Sliders, 
  Share2, 
  Sparkles, 
  Smartphone, 
  Gauge, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight, 
  Copy, 
  Flame, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Info,
  Play
} from 'lucide-react';
import { initAds, showInterstitial, noteUserBusy, BANNER_POSITION } from './ads.js';
import FloatingSidebar from './FloatingSidebar.jsx';

const EMPTY_METRICS = { avgLatency: 0, pollingRate: 0, jitter: 0, smoothnessScore: 0, samples: 0 };

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const rateDelay = (ms) => (ms < 8 ? 'Excellent' : ms < 16 ? 'Good' : ms < 32 ? 'Average' : 'Laggy');
const rateHz = (hz) => (hz >= 240 ? 'Very high' : hz >= 120 ? 'High' : hz >= 60 ? 'Standard' : 'Low');
const rateJitter = (ms) => (ms < 1.5 ? 'Very stable' : ms < 4 ? 'Stable' : 'Uneven');
const rateSmooth = (n) => (n >= 90 ? 'Butter smooth' : n >= 75 ? 'Smooth' : 'Choppy');

export default function App() {
  // AdMob: banner height (px) so content isn't hidden behind the banner
  const [bannerHeight, setBannerHeight] = useState(0);

  useEffect(() => {
    initAds((h) => setBannerHeight(h));
  }, []);

  // Test Canvas State
  const [isTesting, setIsTesting] = useState(false);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);

  // Animation Preset Simulator State
  const [selectedPreset, setSelectedPreset] = useState('0.5x'); // '1.0x', '0.5x', '0x'
  const [previewRunning, setPreviewRunning] = useState(false);

  // AI Diagnostic State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [deviceModel, setDeviceModel] = useState('Android Device (API 34 / One UI 6)');
  const [primaryUse, setPrimaryUse] = useState('Competitive Gaming & Fast UI');

  // Viral Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Canvas Refs
  const canvasRef = useRef(null);
  const trailRef = useRef([]);
  const lastTimeRef = useRef(performance.now());
  const intervalsRef = useRef([]);
  const delaysRef = useRef([]);
  const lastPublishRef = useRef(0);

  // Setup Canvas Interactive Drawing & Latency Calculation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;

      // Draw background grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render touch trail
      const trail = trailRef.current;
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const pt1 = trail[i - 1];
          const pt2 = trail[i];
          const age = (now - pt2.time) / 1000;
          const alpha = Math.max(0, 1 - age * 1.5);

          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
          ctx.lineWidth = Math.max(2, 7 * (1 - age));
          ctx.lineCap = 'round';
          ctx.stroke();

          // Glowing touch node points
          ctx.beginPath();
          ctx.arc(pt2.x, pt2.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Filter out points older than 800ms
      trailRef.current = trail.filter(pt => now - pt.time < 800);

      // Prompt overlay text
      if (trailRef.current.length === 0 && !isTesting) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ Swipe, Drag or Tap here to measure live response & sampling', width / 2, height / 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isTesting]);

  const handlePointerDown = (e) => {
    noteUserBusy();
    lastTimeRef.current = e.nativeEvent.timeStamp;
  };

  const handlePointerMove = (e) => {
    noteUserBusy();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const native = e.nativeEvent;

    if (!isTesting) setIsTesting(true);

    // Browsers batch several hardware touch samples into one event per frame.
    // getCoalescedEvents() returns every real sample with its own timestamp.
    const coalesced = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const events = coalesced.length ? coalesced : [native];

    // Delay between the OS stamping the touch and our code receiving it
    const delay = Math.max(0, now - native.timeStamp);
    delaysRef.current.push(delay);
    if (delaysRef.current.length > 120) delaysRef.current.shift();

    for (const ev of events) {
      trailRef.current.push({ x: ev.clientX - rect.left, y: ev.clientY - rect.top, time: now });
      const dt = ev.timeStamp - lastTimeRef.current;
      lastTimeRef.current = ev.timeStamp;
      if (dt > 0 && dt < 100) {
        intervalsRef.current.push(dt);
        if (intervalsRef.current.length > 240) intervalsRef.current.shift();
      }
    }

    // Update the numbers ~10x/second so the UI itself doesn't add lag
    if (now - lastPublishRef.current < 100) return;
    lastPublishRef.current = now;

    const iv = intervalsRef.current;
    if (iv.length < 5) return;
    const avg = mean(iv);
    const jitter = Math.sqrt(mean(iv.map((v) => (v - avg) ** 2)));
    const smooth = Math.max(0, Math.min(100, Math.round(100 - (jitter / avg) * 100)));

    setMetrics({
      avgLatency: parseFloat(mean(delaysRef.current).toFixed(1)),
      pollingRate: Math.min(1000, Math.round(1000 / avg)),
      jitter: parseFloat(jitter.toFixed(1)),
      smoothnessScore: smooth,
      samples: iv.length
    });
  };

  const resetCanvasTest = () => {
    const hadTest = metrics.samples > 0;
    trailRef.current = [];
    intervalsRef.current = [];
    delaysRef.current = [];
    setIsTesting(false);
    setMetrics(EMPTY_METRICS);
    // Calm break between two tests (ads.js enforces cooldown, session cap and idle rules)
    if (hadTest) setTimeout(() => showInterstitial(), 600);
  };

  // On-device advisor: recommendations from the measured touch data (no network, no API key)
  const runAiDiagnostics = () => {
    setAiLoading(true);
    setAiReport(null);

    setTimeout(() => {
      const measured = metrics.samples > 0;
      let win = '0.5x', trans = '0.5x', anim = '0.5x';
      if (primaryUse === 'Daily Smooth Scrolling & Media') {
        anim = '1x (keep natural scrolling & ripples)';
      } else if (primaryUse === 'Maximum Battery Conservation') {
        win = 'Animation off';
        trans = 'Animation off';
      }

      const tips = [
        'Set the display to the highest refresh rate: Settings > Display > Motion smoothness.',
        'Keep the screen clean and dry, and avoid thick screen protectors, which can hurt touch tracking.'
      ];
      if (measured && metrics.pollingRate < 120) {
        tips.push('Your measured touch sampling is on the low side. Check that battery saver is off, as it can lower touch and display rates.');
      }
      if (measured && metrics.smoothnessScore < 85) {
        tips.push('Touch timing was uneven. Restart the phone, close background apps, and update the system.');
      }
      if (primaryUse === 'Competitive Gaming & Fast UI') {
        tips.push('Turn on your phone\'s Game mode or Game Booster, if it has one, to reduce background activity.');
      }

      const off = win === 'Animation off';
      setAiReport({
        summary: measured
          ? `Measured ${metrics.pollingRate} Hz touch sampling, ${metrics.avgLatency} ms input delay and a smoothness score of ${metrics.smoothnessScore}/100 for ${deviceModel}. Lower animation scales remove the built-in wait between your tap and the next screen.`
          : `No touch test data yet, so these are general recommendations for ${deviceModel}. Swipe inside the test box first for advice based on your screen.`,
        recommendedWindowScale: win,
        recommendedTransitionScale: trans,
        recommendedAnimatorScale: anim,
        estimatedSpeedGain: off ? 'Instant transitions' : 'Animations run 2x faster',
        gamingTips: tips
      });
      setAiLoading(false);
    }, 500);
  };

  const hasData = metrics.samples > 0;
  const val = (v) => (hasData ? v : '--');

  const triggerAnimationPreview = () => {
    setPreviewRunning(true);
    setTimeout(() => setPreviewRunning(false), 2000);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-20"
      style={{
        paddingTop: BANNER_POSITION === 'TOP' ? bannerHeight : 0,
        paddingBottom: BANNER_POSITION === 'BOTTOM' ? bannerHeight + 80 : undefined,
      }}
    >
      
      {/* Background Neon Glow Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] right-[-10%] w-[550px] h-[550px] bg-purple-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[25%] w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Header Bar */}
      <header
        className="z-20 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky"
        style={{ top: BANNER_POSITION === 'TOP' ? bannerHeight : 0 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  VELOCITY<span className="text-cyan-400">TOUCH</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-semibold">
                  MOTION LAB v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Android Soft-Touch Latency & Animation Tuning Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Share Card</span>
            </button>
            <a
              href="#dev-guide"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:opacity-95 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Developer Guide</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Hero Section */}
        <section className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/40 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero-Lag Touch Calibration & Animation Scale Tuner</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Unlock Insanely Smooth <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Soft Touch & Instant Transitions
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Eliminate artificial UI lag on your Android device. Test live screen touch polling rates, analyze drag input jitter in real time, and preview how switching animation scales from 1.0x to 0.5x makes your phone feel twice as fast.
            </p>
          </div>
        </section>

        {/* Section 1: Touch Latency Canvas + AI Performance Advisor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Touch Latency & Swipe Smoothness Canvas (7 cols) */}
          <section id="touch-test" className="scroll-mt-24 lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-100 text-base">Touch Latency & Swipe Smoothness Radar</h2>
                  <p className="text-xs text-slate-400">Drag or swipe your finger inside the box to test pointer response</p>
                </div>
              </div>

              <button
                onClick={resetCanvasTest}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors border border-slate-700/50"
                title="Reset Touch Test"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas Box */}
            <div className="relative w-full h-[320px] rounded-xl border border-slate-700/60 bg-slate-950/90 overflow-hidden cursor-crosshair touch-none shadow-inner">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                className="w-full h-full block"
              />

              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur-md pointer-events-none text-xs font-mono">
                <span className={`w-2 h-2 rounded-full ${isTesting ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-slate-300">
                  {isTesting ? 'RECORDING POINTER SAMPLES...' : 'STANDBY - SWIPE CANVAS'}
                </span>
              </div>

              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-cyan-400 pointer-events-none">
                {metrics.samples} Frames Tracked
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 font-medium block">Input Delay</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-cyan-400">{val(metrics.avgLatency)}</span>
                  <span className="text-xs text-slate-400">ms</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-medium">{hasData ? rateDelay(metrics.avgLatency) : 'Not tested'}</span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 font-medium block">Sampling Rate</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-purple-400">{val(metrics.pollingRate)}</span>
                  <span className="text-xs text-slate-400">Hz</span>
                </div>
                <span className="text-[10px] text-purple-300 font-medium">{hasData ? rateHz(metrics.pollingRate) : 'Not tested'}</span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 font-medium block">Pointer Jitter</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-amber-400">{hasData ? `±${metrics.jitter}` : '--'}</span>
                  <span className="text-xs text-slate-400">ms</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{hasData ? rateJitter(metrics.jitter) : 'Not tested'}</span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 font-medium block">Smoothness Index</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-400">{val(metrics.smoothnessScore)}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">{hasData ? rateSmooth(metrics.smoothnessScore) : 'Not tested'}</span>
              </div>
            </div>
          </section>

          {/* AI Performance Advisor (5 cols) */}
          <section className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-100 text-base">Smart Performance Advisor</h2>
                  <p className="text-xs text-slate-400">Recommendations from your measured touch data</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Device Model & OS Version
                  </label>
                  <input
                    type="text"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Pixel 8 Pro / Android 14"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Primary Usage Goal
                  </label>
                  <select
                    value={primaryUse}
                    onChange={(e) => setPrimaryUse(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Competitive Gaming & Fast UI">Competitive Gaming & Fast UI</option>
                    <option value="Daily Smooth Scrolling & Media">Daily Smooth Scrolling & Media</option>
                    <option value="Maximum Battery Conservation">Maximum Battery Conservation</option>
                  </select>
                </div>
              </div>

              <button
                onClick={runAiDiagnostics}
                disabled={aiLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Touch Physics...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4 text-cyan-200" />
                    <span>Get Recommendations</span>
                  </>
                )}
              </button>

              {aiReport && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Optimization Breakdown</span>
                  </div>
                  
                  <p className="text-slate-300 leading-relaxed text-[11.5px]">
                    {aiReport.summary}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block">Window Scale</span>
                      <span className="font-mono font-bold text-cyan-400">{aiReport.recommendedWindowScale}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block">Transition Scale</span>
                      <span className="font-mono font-bold text-purple-400">{aiReport.recommendedTransitionScale}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block">Animator Duration</span>
                      <span className="font-mono font-bold text-emerald-400">{aiReport.recommendedAnimatorScale}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-500/20">
                    <span className="text-slate-300 font-medium">Estimated Speed Boost:</span>
                    <span className="font-bold text-emerald-400 font-mono">{aiReport.estimatedSpeedGain}</span>
                  </div>

                  {aiReport.gamingTips && aiReport.gamingTips.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-200 block">Advanced Tweaks:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                        {aiReport.gamingTips.map((tip, idx) => (
                          <li key={idx} className="leading-snug">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!aiReport && !aiLoading && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <Info className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Tap "Get Recommendations" to generate custom animation scale recommendations tailored to your hardware.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* Section 2: Animation Scale Control Panel & Simulator */}
        <section id="simulator" className="scroll-mt-24 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-slate-100 text-lg">Animation Scale Control Panel & Simulator</h2>
              </div>
              <p className="text-xs text-slate-400">
                Compare Window, Transition, and Animator scales side-by-side with live UI previews.
              </p>
            </div>

            {/* Presets Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 gap-1 self-start sm:self-auto">
              {['1.0x', '0.5x', '0x'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSelectedPreset(preset)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                    selectedPreset === preset
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset === '1.0x' ? 'Stock (1.0x)' : preset === '0.5x' ? 'Ultra (0.5x)' : 'Off (0x)'}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Descriptions Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Window Animation Scale</span>
              <h3 className="font-bold text-slate-200 text-sm">Pop-ups & Dialog Boxes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controls how fast dialog windows, menus, and bottom sheets fade in. At <span className="text-cyan-300 font-semibold">{selectedPreset}</span>, popups appear instantly without sluggish delay.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">Transition Animation Scale</span>
              <h3 className="font-bold text-slate-200 text-sm">App Launch & Activity Switching</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controls screen sliding animations when launching or exiting apps. Setting this to <span className="text-purple-300 font-semibold">{selectedPreset}</span> makes multitasking lightning fast.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Animator Duration Scale</span>
              <h3 className="font-bold text-slate-200 text-sm">General UI Motion & Physics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controls internal view property animations (buttons, ripples, progress bars). At <span className="text-emerald-300 font-semibold">{selectedPreset}</span>, your phone responds instantly to your touch.
              </p>
            </div>
          </div>

          {/* Visual Side-by-Side Simulators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Simulator 1: App Launch Dialog */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-[270px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    App Launch & Dialog Pop-up
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                    Scale: {selectedPreset}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Simulates window popup transition speed.</p>
              </div>

              <div className="relative w-full h-[140px] bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                {previewRunning ? (
                  <div
                    className="w-44 bg-slate-800 border border-cyan-500/40 rounded-xl p-4 shadow-xl text-center space-y-2 transform transition-all"
                    style={{
                      transitionDuration: selectedPreset === '1.0x' ? '600ms' : selectedPreset === '0.5x' ? '220ms' : '0ms',
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="h-2 w-20 bg-slate-700 rounded mx-auto" />
                    <span className="text-[10px] text-emerald-400 font-mono block">Loaded Instantly</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Click trigger to test speed</p>
                )}
              </div>

              <button
                onClick={triggerAnimationPreview}
                disabled={previewRunning}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Window Pop-up</span>
              </button>
            </div>

            {/* Simulator 2: Gesture Slide */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-[270px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Gesture Slide Transition
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                    Scale: {selectedPreset}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Simulates horizontal page sliding speed.</p>
              </div>

              <div className="relative w-full h-[140px] bg-slate-900 rounded-lg border border-slate-800 flex items-center overflow-hidden p-3">
                <div
                  className="w-full h-full bg-gradient-to-r from-purple-900/60 to-cyan-900/60 border border-slate-700 rounded-lg p-3 flex items-center justify-between transition-all"
                  style={{
                    transform: previewRunning ? 'translateX(0%)' : 'translateX(-100%)',
                    transitionDuration: selectedPreset === '1.0x' ? '550ms' : selectedPreset === '0.5x' ? '200ms' : '0ms',
                    transitionTimingFunction: 'ease-out'
                  }}
                >
                  <div className="space-y-1">
                    <div className="h-2.5 w-24 bg-purple-400/50 rounded" />
                    <div className="h-2 w-14 bg-slate-600 rounded" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400" />
                </div>
              </div>

              <button
                onClick={triggerAnimationPreview}
                disabled={previewRunning}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Page Slide</span>
              </button>
            </div>

          </div>
        </section>

        {/* Section 3: Android Developer Options Guide */}
        <section id="dev-guide" className="scroll-mt-24 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-lg">How to Apply These Settings on Android</h2>
              <p className="text-xs text-slate-400">Step-by-step instructions for Android developers & enthusiasts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold font-mono text-xs flex items-center justify-center">
                01
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Unlock Developer Mode</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Open <span className="text-slate-200 font-medium">Settings &gt; About Phone &gt; Software Info</span>. Tap <span className="text-cyan-300 font-semibold">Build Number</span> 7 times until developer access is granted.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 font-bold font-mono text-xs flex items-center justify-center">
                02
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Find Drawing Section</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Go to <span className="text-slate-200 font-medium">Settings &gt; System &gt; Developer Options</span>. Scroll down to locate the <span className="text-purple-300 font-semibold">Drawing</span> category.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center">
                03
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Change Scales to 0.5x</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Set Window, Transition, and Animator scales to <span className="text-white font-bold">0.5x</span> for instant responsive navigation.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-xs text-slate-300">
              <strong className="text-white">Pro Tip:</strong> These settings persist across reboots and require zero root access or modified system partitions.
            </p>
          </div>
        </section>

      </main>

      {/* Floating left-edge quick panel */}
      <FloatingSidebar
        metrics={metrics}
        hasData={hasData}
        preset={selectedPreset}
        onPreset={setSelectedPreset}
        onReset={resetCanvasTest}
        onShare={() => setShowShareModal(true)}
        topInset={(BANNER_POSITION === 'TOP' ? bannerHeight : 0) + 72}
        bottomInset={BANNER_POSITION === 'BOTTOM' ? bannerHeight : 0}
      />

      {/* Viral Benchmark Share Card Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-slate-100 text-base">Viral Benchmark Share Card</h3>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  // Interstitial when the user closes the share card
                  showInterstitial();
                }}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-md bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Shareable Card Graphic */}
            <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950/80 border border-cyan-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm tracking-wider text-white">
                  VELOCITY<span className="text-cyan-400">TOUCH</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  {hasData ? `MEASURED ${metrics.pollingRate}HZ` : 'RUN TEST FIRST'}
                </span>
              </div>

              <div className="py-2 border-y border-slate-800 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Input Delay</span>
                  <span className="text-2xl font-bold font-mono text-cyan-400">{val(metrics.avgLatency)} ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Sampling Rate</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">{val(metrics.pollingRate)} Hz</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Recommended Animation:</span>
                <span className="font-mono font-bold text-emerald-400">0.5x Ultra Scale</span>
              </div>

              <div className="text-[10px] text-slate-500 text-center font-mono pt-1">
                VelocityTouch & Motion Lab • Built for Android Enthusiasts
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={async () => {
                  const text = hasData
                    ? `My phone's touch test on VelocityTouch: ${metrics.pollingRate} Hz sampling, ${metrics.avgLatency} ms input delay, smoothness ${metrics.smoothnessScore}/100.`
                    : 'Test your phone\'s touch response with VelocityTouch & Motion Lab.';
                  try {
                    if (navigator.share) await navigator.share({ text });
                    else await navigator.clipboard.writeText(text);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  } catch (e) {
                    // user closed the share sheet
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Done!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Share Result</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="mt-16 text-center text-xs text-slate-400 space-y-1">
        <p>© 2026 VelocityTouch & Motion Lab • All rights reserved</p>
        <p className="text-[11px] text-slate-400 font-medium">Developed by RM.Ologuin</p>
      </footer>
    </div>
  );
}