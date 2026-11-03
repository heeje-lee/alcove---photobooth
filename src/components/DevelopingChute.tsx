import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FilmMode } from '../types/booth';
import { boothSound } from '../utils/soundFx';

interface DevelopingChuteProps {
  unexposedStripUrl: string;
  developedStripUrl: string;
  filmMode?: FilmMode;
  onFinishedDeveloping: () => void;
}

const BW_CHEMICAL_STAGES = [
  { threshold: 0, label: '01. Silver Developer Bath', detail: 'submerging unexposed emulsion' },
  { threshold: 28, label: '02. Latent Image Emergence', detail: 'shadows & highlights forming' },
  { threshold: 62, label: '03. Acid Stop & Silver Fixer', detail: 'locking grainy 35mm blacks' },
  { threshold: 88, label: '04. Warm Air Chute Dry', detail: 'delivering finished strip' },
];

const COLOR_CHEMICAL_STAGES = [
  { threshold: 0, label: '01. C-41 Color Developer Bath', detail: 'activating warm film dyes' },
  { threshold: 28, label: '02. Latent Color Emergence', detail: 'skin tones & grain forming' },
  { threshold: 62, label: '03. Bleach & Stabilizer Rinse', detail: 'locking analog 35mm colors' },
  { threshold: 88, label: '04. Warm Air Chute Dry', detail: 'delivering finished strip' },
];

export const DevelopingChute: React.FC<DevelopingChuteProps> = ({
  unexposedStripUrl,
  developedStripUrl,
  filmMode = 'bw',
  onFinishedDeveloping,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    boothSound.playChuteDrop();

    const durationMs = 5600;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed < durationMs) {
        rafId = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          onFinishedDeveloping();
        }, 380);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onFinishedDeveloping]);

  const stages = filmMode === 'color' ? COLOR_CHEMICAL_STAGES : BW_CHEMICAL_STAGES;
  const currentStage =
    [...stages].reverse().find((s) => progress >= s.threshold) || stages[0];

  // Authentic silver-halide emergence curve: stays completely unseen for first ~22%,
  // then ghostly low-contrast shapes emerge, sharpening into full B&W by 95%.
  const normalized = Math.max(0, (progress - 18) / 82);
  const developedOpacity = Math.min(1, Math.pow(normalized, 1.35));
  const blurPx = Math.max(0, (1 - normalized) * 10);
  const contrastPct = Math.round(55 + normalized * 45);
  const brightnessPct = Math.round(135 - normalized * 35);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Status Header */}
      <div className="w-full mb-4 flex items-center justify-between gap-4 px-1">
        <div>
          <h2 className="font-display text-xl font-medium text-[#f5f2eb]">
            Developing Your Strip
          </h2>
          <p className="text-xs text-[#a9a296] mt-0.5">
            {currentStage.label} · {currentStage.detail}
          </p>
        </div>
        <span className="font-mono-tabular text-sm font-medium text-[#f2b84b] shrink-0">
          {progress}%
        </span>
      </div>

      {/* Progress Bar (Transform scaleX only — GPU Compositor safe) */}
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-6">
        <div
          className="h-full w-full bg-[#f2b84b] origin-left transition-transform duration-100"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      {/* Physical Brushed Chrome Photobooth Delivery Chute Slot */}
      <div className="w-full rounded-3xl bg-[#111822]/88 backdrop-blur-md border border-white/15 p-5 flex flex-col items-center overflow-hidden shadow-2xl">
        <div className="w-56 sm:w-64 h-4 rounded-full bg-[#070609] border border-white/20 shadow-inner relative z-20" />
        <span className="text-[10px] font-mono-tabular tracking-widest text-[#7f796f] mt-1.5 mb-2">
          DIGITAL FILM DELIVERY SLOT
        </span>

        {/* Strip Sliding Downward Out of the Slot */}
        <div className="relative w-40 sm:w-48 overflow-hidden pt-1 pb-2 flex justify-center">
          <motion.div
            initial={{ y: -220, opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full shadow-2xl rounded-sm overflow-hidden"
          >
            {/* Base Layer: Unexposed Darkroom Strip (Borders visible, photos hidden milky charcoal) */}
            {unexposedStripUrl && (
              <img
                src={unexposedStripUrl}
                alt="Unexposed photobooth strip emerging from slot"
                referrerPolicy="no-referrer"
                className="w-full h-auto block select-none"
              />
            )}

            {/* Top Layer: Chemically Developing B&W Portraits */}
            {developedStripUrl && (
              <img
                src={developedStripUrl}
                alt="Chemically developing 4-frame black and white strip"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover select-none"
                style={{
                  opacity: developedOpacity,
                  filter: `blur(${blurPx.toFixed(1)}px) contrast(${contrastPct}%) brightness(${brightnessPct}%)`,
                }}
              />
            )}
          </motion.div>
        </div>

        <div className="mt-4 w-full flex items-center justify-between gap-3 pt-3 border-t border-white/8">
          <span className="text-xs text-[#a9a296]">
            Photos stay hidden until chemical bath finishes
          </span>
          <button
            type="button"
            onClick={onFinishedDeveloping}
            className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-[#d8d3c8] hover:text-white bg-white/8 hover:bg-white/14 transition-colors whitespace-nowrap shrink-0"
          >
            Reveal Now
          </button>
        </div>
      </div>
    </div>
  );
};
