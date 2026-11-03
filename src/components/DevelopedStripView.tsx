import React, { useState } from 'react';
import { Check, Download, Maximize2, RotateCcw, Share, Shuffle, X } from 'lucide-react';
import { FilmMode, STRIP_THEMES, StripThemeId, formatCurrentStripDate } from '../types/booth';
import { detectAppleIOS, saveStripToPhotos } from '../utils/iosSave';
import { AnimatedThemeCharacters } from './AnimatedThemeCharacters';
import { FilmModeSelector } from './FilmModeSelector';
import { ThemeSelector } from './ThemeSelector';

interface DevelopedStripViewProps {
  stripDataUrl: string;
  selectedTheme: StripThemeId;
  filmMode: FilmMode;
  canSwitchFilmMode: boolean;
  customNote: string;
  stickerSeed: number;
  isRenderingTheme: boolean;
  onChangeTheme: (theme: StripThemeId) => void;
  onChangeFilmMode: (mode: FilmMode) => void;
  onChangeCustomNote: (note: string) => void;
  onShuffleStickers: () => void;
  onRetakeNewStrip: () => void;
}

export const DevelopedStripView: React.FC<DevelopedStripViewProps> = ({
  stripDataUrl,
  selectedTheme,
  filmMode,
  canSwitchFilmMode,
  customNote,
  stickerSeed,
  isRenderingTheme,
  onChangeTheme,
  onChangeFilmMode,
  onChangeCustomNote,
  onShuffleStickers,
  onRetakeNewStrip,
}) => {
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [showPressHoldSheet, setShowPressHoldSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isIOS = detectAppleIOS();
  const activeTheme = STRIP_THEMES.find((t) => t.id === selectedTheme) || STRIP_THEMES[0];
  const defaultDate = formatCurrentStripDate();

  const handleSave = async () => {
    if (!stripDataUrl || isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveStripToPhotos(stripDataUrl, selectedTheme);
      if (result.method === 'press-and-hold-prompt') {
        setShowPressHoldSheet(true);
      }
      if (result.method !== 'cancelled') {
        setSaveFeedback(result.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left / Top on Mobile: Crisp Developed Strip Showcase + Animated Characters */}
      <div className="lg:col-span-6 flex flex-col items-center">
        <div className="w-full rounded-3xl bg-[#111822]/84 backdrop-blur-md border border-white/14 p-5 sm:p-7 flex flex-col items-center relative shadow-2xl">
          <div className="w-full flex items-center justify-between gap-2 text-xs text-[#c6cdd7] mb-4">
            <span>
              {filmMode === 'color' ? 'Grainy 35mm Color Print' : 'Grainy 35mm Silver Print'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onShuffleStickers}
                className="min-h-[38px] px-2.5 py-1 rounded-lg text-xs text-[#f6f4ef] hover:bg-white/14 flex items-center gap-1.5 bg-white/8 transition-colors whitespace-nowrap shrink-0"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#f2b84b]" />
                Shuffle Stickers
              </button>
              <button
                type="button"
                onClick={() => setShowPressHoldSheet(true)}
                className="min-h-[38px] px-2.5 py-1 rounded-lg text-xs text-[#d6dce4] hover:text-white flex items-center gap-1.5 bg-white/6 hover:bg-white/12 transition-colors whitespace-nowrap shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Full Size
              </button>
            </div>
          </div>

          {/* Strip + Floating Animated Theme Characters */}
          <div className="relative w-44 sm:w-52 transition-opacity duration-150 my-1">
            <AnimatedThemeCharacters themeId={selectedTheme} seed={stickerSeed} />
            <img
              src={stripDataUrl}
              alt={`4-frame grainy ${filmMode === 'color' ? 'color' : 'black-and-white'} photobooth strip with ${activeTheme.name} stickers`}
              referrerPolicy="no-referrer"
              className={`ios-saveable-image relative z-0 w-full h-auto rounded-sm shadow-[0_24px_60px_rgba(0,0,0,0.72)] transition-opacity duration-150 ${
                isRenderingTheme ? 'opacity-65' : 'opacity-100'
              }`}
            />
          </div>

          <p className="mt-4 text-xs text-[#c6cdd7] text-center">
            {isIOS
              ? 'Tap "Save to Photos" below, or touch & hold the strip image to Save to Photos.'
              : 'Tap "Shuffle Stickers" anytime to randomize character stickers over your strip.'}
          </p>
        </div>
      </div>

      {/* Right / Bottom on Mobile: Live Film Stock, Theme Switcher, Shuffle, Date Stamp & Save Controls */}
      <div className="lg:col-span-6 space-y-6">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#f6f4ef] text-balance">
            Your Strip Is Developed
          </h2>
          <p className="text-sm text-[#c6cdd7] mt-1.5 leading-relaxed">
            Switch between Black &amp; White and Warm Color grainy 35mm film, change strip themes, or shuffle your character stickers before saving to Photos.
          </p>
        </div>

        {/* Live 35mm Film Stock Toggle (B&W vs Grainy Color) */}
        {canSwitchFilmMode && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#e6ebf2]">
              35mm Film Finish
            </span>
            <FilmModeSelector
              filmMode={filmMode}
              onChangeFilmMode={onChangeFilmMode}
            />
          </div>
        )}

        {/* Instant Theme Switcher + Randomize Layout Button */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs font-medium text-[#e6ebf2]">
              Switch Strip Theme
            </label>
            <button
              type="button"
              onClick={onShuffleStickers}
              className="text-xs font-medium text-[#f7ca6d] hover:underline flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Randomize Stickers
            </button>
          </div>
          <ThemeSelector
            selectedTheme={selectedTheme}
            onSelectTheme={onChangeTheme}
          />
        </div>

        {/* Clean Date + Year Stamp Input (16px text-base prevents iOS Safari auto-zoom) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="strip-stamp-input" className="text-xs font-medium text-[#e6ebf2]">
              Strip Date Stamp (Includes Year)
            </label>
            <span className="text-xs font-mono-tabular text-[#b8c0ca]">
              {customNote.length}/26
            </span>
          </div>
          <input
            id="strip-stamp-input"
            type="text"
            maxLength={26}
            value={customNote}
            onChange={(e) => onChangeCustomNote(e.target.value)}
            placeholder={defaultDate}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#111822]/82 backdrop-blur-md border border-white/14 text-base text-[#f6f4ef] placeholder:text-[#7c8591] focus:outline-none focus:border-[#f2b84b] transition-colors"
          />
        </div>

        {/* Primary Save CTA + New Session */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-[#f2b84b] text-[#0e131a] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg hover:bg-[#f7c463] active:scale-[0.99] transition-all whitespace-nowrap"
          >
            {isIOS ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            Save to Photos
          </button>

          {saveFeedback && (
            <div className="p-3.5 rounded-xl bg-[#141e2b]/90 backdrop-blur-md border border-white/14 flex items-start gap-2.5 text-xs text-[#e6ebf2]">
              <Check className="w-4 h-4 text-[#f2b84b] shrink-0 mt-0.5" />
              <span>{saveFeedback}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRetakeNewStrip}
            className="w-full min-h-[48px] px-5 py-2.5 rounded-2xl bg-[#121a24]/85 backdrop-blur-md border border-white/14 text-[#f6f4ef] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#1a2533] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Shoot Another Strip
          </button>
        </div>
      </div>

      {/* iOS Native Press & Hold / Full-Resolution Sheet */}
      {showPressHoldSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 pt-safe pb-safe overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Save strip to Apple Photos"
        >
          <div className="w-full max-w-md flex items-center justify-between gap-4 py-2">
            <div>
              <h3 className="text-sm font-semibold text-[#f6f4ef]">
                Save Directly to iPhone Photos
              </h3>
              <p className="text-xs text-[#b0b8c3]">
                Touch &amp; hold the photo strip below, then tap “Save to Photos”
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPressHoldSheet(false)}
              aria-label="Close full-size strip view"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 flex items-center justify-center text-[#f6f4ef] hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="my-4 flex-1 flex items-center justify-center w-full">
            <img
              src={stripDataUrl}
              alt="Full-resolution photobooth strip — touch and hold to save to Apple Photos"
              referrerPolicy="no-referrer"
              className="ios-saveable-image max-h-[72dvh] w-auto rounded-sm shadow-2xl"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPressHoldSheet(false)}
            className="w-full max-w-md min-h-[48px] rounded-xl bg-white/12 text-sm font-medium text-[#f6f4ef] hover:bg-white/20 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
