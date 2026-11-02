import React, { useEffect, useRef, useState } from 'react';
import { Zap, ChevronLeft, RotateCcw, Share2, Activity, Layers, Sliders } from 'lucide-react';

const POS_KEY = 'vt_sidebar_pos';
const PRESETS = ['1.0x', '0.5x', '0x'];
const TAB_W = 38;
const TAB_H = 92;
const DRAWER_H = 360;

const loadPos = () => {
  try {
    const v = parseFloat(localStorage.getItem(POS_KEY));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.4;
  } catch (e) {
    return 0.4;
  }
};

/**
 * Floating left-edge tab that expands into a quick panel.
 * Drag the tab up/down to move it, tap it to open/close.
 * (Opening is tap-only on purpose: a left-edge swipe is Android's Back gesture.)
 */
export default function FloatingSidebar({
  metrics,
  hasData,
  preset,
  onPreset,
  onReset,
  onShare,
  topInset = 0,
  bottomInset = 0,
}) {
  const [open, setOpen] = useState(false);
  const [frac, setFrac] = useState(loadPos);
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const drag = useRef({ active: false, startY: 0, startFrac: 0, moved: false });

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const minTop = topInset + 8;
  const maxTop = Math.max(minTop, vh - bottomInset - TAB_H - 8);
  const range = Math.max(1, maxTop - minTop);
  const top = minTop + frac * range;
  const drawerTop = Math.max(minTop, Math.min(top, vh - bottomInset - DRAWER_H - 8));

  const onPointerDown = (e) => {
    drag.current = { active: true, startY: e.clientY, startFrac: frac, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dy) > 6) d.moved = true;
    if (d.moved) setFrac(Math.min(1, Math.max(0, d.startFrac + dy / range)));
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.moved) {
      try {
        localStorage.setItem(POS_KEY, String(frac));
      } catch (e) {
        // storage unavailable - position just won't be remembered
      }
    } else {
      setOpen((o) => !o);
    }
  };

  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOpen(false);
  };

  const stat = (label, value, unit, color) => (
    <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-mono font-bold text-sm ${color}`}>
        {hasData ? value : '--'}
        <span className="text-[9px] text-slate-500 ml-0.5">{unit}</span>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30"
          onPointerDown={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed z-40 w-64 rounded-2xl border border-cyan-500/30 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 p-3 space-y-3 transition-all duration-200 ${
          open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
        }`}
        style={{
          top: drawerTop,
          left: `calc(${TAB_W}px + env(safe-area-inset-left))`,
          maxHeight: vh - bottomInset - minTop - 8,
          overflowY: 'auto',
        }}
        role="dialog"
        aria-label="Quick panel"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <Zap className="w-4 h-4 text-cyan-400" />
          Quick Panel
        </div>

        <div className="grid grid-cols-3 gap-2">
          {stat('Sampling', metrics.pollingRate, 'Hz', 'text-purple-400')}
          {stat('Delay', metrics.avgLatency, 'ms', 'text-cyan-400')}
          {stat('Smooth', metrics.smoothnessScore, '/100', 'text-emerald-400')}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Animation scale preview</div>
          <div className="flex p-1 rounded-lg bg-slate-950 border border-slate-800 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => onPreset(p)}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-mono font-semibold transition-all ${
                  preset === p
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onReset();
              setOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Reset test
          </button>
          <button
            onClick={() => {
              onShare();
              setOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" /> Share
          </button>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Jump to</div>
          <button
            onClick={() => jump('touch-test')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-200 active:scale-[0.98]"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" /> Touch test
          </button>
          <button
            onClick={() => jump('simulator')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-200 active:scale-[0.98]"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Animation simulator
          </button>
          <button
            onClick={() => jump('dev-guide')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-200 active:scale-[0.98]"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Setup guide
          </button>
        </div>
      </div>

      {/* Edge tab: shows live sampling rate like a watermark, drag up/down to move */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`fixed left-0 z-40 flex flex-col items-center justify-center gap-1 rounded-r-2xl border border-l-0 border-cyan-500/40 bg-gradient-to-b from-slate-900/90 to-cyan-950/80 backdrop-blur-md shadow-lg shadow-cyan-500/20 select-none cursor-pointer transition-opacity ${
          open ? 'opacity-100' : 'opacity-80'
        }`}
        style={{
          top,
          width: TAB_W,
          height: TAB_H,
          paddingLeft: 'env(safe-area-inset-left)',
          touchAction: 'none',
        }}
        role="button"
        aria-label={open ? 'Close quick panel' : 'Open quick panel'}
        aria-expanded={open}
      >
        {open ? (
          <ChevronLeft className="w-5 h-5 text-cyan-300" />
        ) : (
          <>
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
            <span className="font-mono font-bold text-[11px] text-purple-300 leading-none">
              {hasData ? metrics.pollingRate : '--'}
            </span>
            <span className="font-mono text-[8px] text-slate-400 leading-none">Hz</span>
          </>
        )}
      </div>
    </>
  );
}
