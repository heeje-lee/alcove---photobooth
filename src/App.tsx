/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, QrCode, Shuffle, Smartphone, Sparkles, Trash2 } from 'lucide-react';
import { AnimatedThemeCharacters } from './components/AnimatedThemeCharacters';
import { BoothCamera, CompletedRollPayload } from './components/BoothCamera';
import { DevelopedStripView } from './components/DevelopedStripView';
import { DevelopingChute } from './components/DevelopingChute';
import { FilmModeSelector } from './components/FilmModeSelector';
import { BetaModalTab, IOSGuideModal } from './components/IOSGuideModal';
import { ThemeSelector } from './components/ThemeSelector';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  BoothStage,
  CHARLIE_BROWN_BG_URL,
  FilmMode,
  HELLO_KITTY_BG_URL,
  STRIP_THEMES,
  SavedStrip,
  StripThemeId,
  formatCurrentStripDate,
  pickRandomOpeningTheme,
} from './types/booth';
import {
  developRawFramesWithFilmMode,
  loadSampleFrames,
  loadSampleRawAndProcessedFrames,
  processUploadedFilesToFrames,
} from './utils/analogFilter';
import { boothSound } from './utils/soundFx';
import { renderPhotoStrip } from './utils/stripRenderer';

const STORAGE_KEY = 'alcove_strips_v5';

function randomSeed(): number {
  return Math.floor(Math.random() * 899999999) + 100000000;
}

export default function App() {
  const [stage, setStage] = useState<BoothStage>(BoothStage.Lobby);
  // Randomize opening theme/background between Hello Kitty and Charlie Brown
  const [selectedTheme, setSelectedTheme] = useState<StripThemeId>(() =>
    pickRandomOpeningTheme()
  );
  const [filmMode, setFilmMode] = useState<FilmMode>('bw');
  const [customNote, setCustomNote] = useState<string>(() => formatCurrentStripDate());
  const [stickerSeed, setStickerSeed] = useState<number>(() => randomSeed());

  // Sample preview strip shown in the Lobby so users can compare themes, film stock & shuffle live
  const [lobbyPreviewUrl, setLobbyPreviewUrl] = useState<string>('');
  const [isLobbyPreviewLoading, setIsLobbyPreviewLoading] = useState<boolean>(true);

  // Active 4 raw + processed frames & rendered strip URLs for current session
  const [activeRawFrames, setActiveRawFrames] = useState<string[]>([]);
  const [activeFrames, setActiveFrames] = useState<string[]>([]);
  const [activeFramesFilmMode, setActiveFramesFilmMode] = useState<FilmMode>('bw');
  const [unexposedStripUrl, setUnexposedStripUrl] = useState<string>('');
  const [developedStripUrl, setDevelopedStripUrl] = useState<string>('');
  const [isRenderingTheme, setIsRenderingTheme] = useState<boolean>(false);

  // Session Film Roll (saved strips)
  const [savedStrips, setSavedStrips] = useState<SavedStrip[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const { isInstalled } = usePWAInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState<boolean>(false);
  const [betaModalTab, setBetaModalTab] = useState<BetaModalTab>('install');
  const lobbyUploadRef = useRef<HTMLInputElement | null>(null);
  const themesSectionRef = useRef<HTMLDivElement | null>(null);
  const filmRollSectionRef = useRef<HTMLElement | null>(null);

  const openBetaModal = (tab: BetaModalTab) => {
    setBetaModalTab(tab);
    setIosGuideOpen(true);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedStrips.slice(0, 3)));
    } catch {
      try {
        const slim = savedStrips.slice(0, 3).map(({ rawFrames: _r, ...rest }) => rest);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      } catch {
        // Ignore storage quota errors on mobile Safari private browsing
      }
    }
  }, [savedStrips]);

  const handleShuffleStickers = useCallback(() => {
    setStickerSeed(randomSeed());
  }, []);

  // Render live sample strip in Lobby whenever selectedTheme, filmMode, or stickerSeed changes
  useEffect(() => {
    let cancelled = false;
    setIsLobbyPreviewLoading(true);

    (async () => {
      try {
        const sampleFrames = await loadSampleFrames(filmMode);
        const url = await renderPhotoStrip({
          frames: sampleFrames,
          themeId: selectedTheme,
          stickerSeed,
        });
        if (!cancelled) {
          setLobbyPreviewUrl(url);
          setIsLobbyPreviewLoading(false);
        }
      } catch {
        if (!cancelled) setIsLobbyPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTheme, filmMode, stickerSeed]);

  // Re-render developed strip live when user switches filmMode (B&W <-> Color), theme, shuffles stickers, or edits date
  useEffect(() => {
    if (stage !== BoothStage.Result || activeFrames.length !== 4) return;

    let cancelled = false;
    setIsRenderingTheme(true);

    const timer = setTimeout(async () => {
      try {
        let framesToRender = activeFrames;
        if (filmMode !== activeFramesFilmMode && activeRawFrames.length === 4) {
          framesToRender = await developRawFramesWithFilmMode(activeRawFrames, filmMode);
          if (!cancelled) {
            setActiveFrames(framesToRender);
            setActiveFramesFilmMode(filmMode);
          }
        }

        const updatedUrl = await renderPhotoStrip({
          frames: framesToRender,
          themeId: selectedTheme,
          customNote,
          stickerSeed,
        });

        if (!cancelled && updatedUrl) {
          setDevelopedStripUrl(updatedUrl);
          setSavedStrips((prev) => {
            if (prev.length === 0) return prev;
            const [latest, ...rest] = prev;
            return [
              {
                ...latest,
                themeId: selectedTheme,
                filmMode,
                customNote,
                stickerSeed,
                frames: framesToRender,
                stripDataUrl: updatedUrl,
              },
              ...rest,
            ];
          });
        }
      } finally {
        if (!cancelled) setIsRenderingTheme(false);
      }
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    selectedTheme,
    filmMode,
    customNote,
    stickerSeed,
    stage,
    activeFrames,
    activeRawFrames,
    activeFramesFilmMode,
  ]);

  const beginChemicalDevelopment = useCallback(
    async ({ rawFrames, processedFrames }: CompletedRollPayload) => {
      const freshSeed = randomSeed();
      setStickerSeed(freshSeed);
      setActiveRawFrames(rawFrames);
      setActiveFrames(processedFrames);
      setActiveFramesFilmMode(filmMode);

      const [blankUrl, finalUrl] = await Promise.all([
        renderPhotoStrip({
          frames: processedFrames,
          themeId: selectedTheme,
          customNote,
          stickerSeed: freshSeed,
          unexposedBlank: true,
        }),
        renderPhotoStrip({
          frames: processedFrames,
          themeId: selectedTheme,
          customNote,
          stickerSeed: freshSeed,
          unexposedBlank: false,
        }),
      ]);

      setUnexposedStripUrl(blankUrl);
      setDevelopedStripUrl(finalUrl);
      setStage(BoothStage.Developing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [selectedTheme, filmMode, customNote]
  );

  const handleFinishDeveloping = useCallback(() => {
    setStage((prevStage) => {
      if (prevStage !== BoothStage.Developing) return prevStage;
      return BoothStage.Result;
    });

    if (activeFrames.length === 4 && developedStripUrl) {
      const newEntry: SavedStrip = {
        id: `strip-${Date.now()}`,
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        themeId: selectedTheme,
        filmMode,
        customNote,
        stickerSeed,
        rawFrames: activeRawFrames.length === 4 ? activeRawFrames : undefined,
        frames: activeFrames,
        stripDataUrl: developedStripUrl,
      };
      setSavedStrips((prev) => [newEntry, ...prev.slice(0, 5)]);
    }
  }, [
    activeFrames,
    activeRawFrames,
    developedStripUrl,
    selectedTheme,
    filmMode,
    customNote,
    stickerSeed,
  ]);

  const handleStepIntoBooth = () => {
    boothSound.unlock();
    setStage(BoothStage.Booth);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLobbyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    boothSound.unlock();
    const payload = await processUploadedFilesToFrames(files, filmMode);
    e.target.value = '';
    if (payload.processedFrames.length === 4) {
      await beginChemicalDevelopment(payload);
    }
  };

  const handleQuickDevelopSample = async () => {
    boothSound.unlock();
    const payload = await loadSampleRawAndProcessedFrames(filmMode);
    await beginChemicalDevelopment(payload);
  };

  const handleOpenSavedStrip = (item: SavedStrip) => {
    const savedMode: FilmMode = item.filmMode ?? 'bw';
    setActiveRawFrames(item.rawFrames ?? []);
    setActiveFrames(item.frames);
    setActiveFramesFilmMode(savedMode);
    setFilmMode(savedMode);
    setSelectedTheme(item.themeId);
    setCustomNote(item.customNote);
    setStickerSeed(item.stickerSeed || randomSeed());
    setDevelopedStripUrl(item.stripDataUrl);
    setStage(BoothStage.Result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSavedStrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedStrips((prev) => prev.filter((item) => item.id !== id));
  };

  const activeThemeMeta =
    STRIP_THEMES.find((t) => t.id === selectedTheme) || STRIP_THEMES[0];

  const previewAspectClass =
    selectedTheme === 'classic-noir' ? 'aspect-[840/3556]' : 'aspect-[840/3990]';

  return (
    <div className="relative min-h-dvh flex flex-col text-[#f6f4ef] isolate">
      {/* Randomized & Theme-Synced Full-Viewport Scenic Background Layer */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#0e141c]"
        aria-hidden="true"
      >
        {/* Hello Kitty Scenic Meadow Background */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            selectedTheme === 'hello-kitty' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={HELLO_KITTY_BG_URL}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1926]/78 via-[#101e2b]/72 to-[#0b151e]/88 backdrop-blur-[2px]" />
        </div>

        {/* Charlie Brown Scenic Sky & Grass Background (scale-[1.46] crops outer gray bars on all viewports) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            selectedTheme === 'charlie-brown' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={CHARLIE_BROWN_BG_URL}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-[1.46]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1826]/78 via-[#111d2b]/72 to-[#0c141d]/88 backdrop-blur-[2px]" />
        </div>

        {/* Midnight Booth Darkroom Background */}
        <div
          className={`absolute inset-0 bg-[#0c0d11] transition-opacity duration-500 ${
            selectedTheme === 'classic-noir' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-[#0f1620]/80 backdrop-blur-md border-b border-white/12 px-4 sm:px-6 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => setStage(BoothStage.Lobby)}
          className="font-display text-lg font-medium tracking-tight text-[#f6f4ef] whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-[#f2b84b]"
        >
          alcove
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#cfd5de]">
          <button
            type="button"
            onClick={handleStepIntoBooth}
            className="hover:text-[#f6f4ef] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Booth
          </button>
          <button
            type="button"
            onClick={() => {
              setStage(BoothStage.Lobby);
              setTimeout(() => {
                themesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-[#f6f4ef] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Themes
          </button>
          <button
            type="button"
            onClick={() => {
              filmRollSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-[#f6f4ef] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Film Roll
          </button>
          <button
            type="button"
            onClick={() => openBetaModal('install')}
            className="hover:text-[#f6f4ef] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Get iOS App
          </button>
          <button
            type="button"
            onClick={() => openBetaModal('share')}
            className="hover:text-[#f6f4ef] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Share Link
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          {stage === BoothStage.Lobby ? (
            <button
              type="button"
              onClick={() => openBetaModal(isInstalled ? 'share' : 'install')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-white/12 hover:bg-white/20 text-xs font-medium text-[#f6f4ef] transition-colors whitespace-nowrap shrink-0"
            >
              {isInstalled ? 'Share App' : 'Get on iPhone'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStepIntoBooth}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#f2b84b] hover:bg-[#f7c463] text-xs font-semibold text-[#0e131a] transition-colors whitespace-nowrap shrink-0"
            >
              New Strip
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-safe">
        {stage === BoothStage.Lobby && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Welcome Copy + Film Stock + Theme Picker + Booth Entry */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2.5">
                <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-[#fffdf8] leading-[1.12] drop-shadow-sm text-balance">
                  Welcome to alcove
                </h1>
                <p className="text-lg sm:text-xl text-[#dce4ee] font-normal tracking-wide">
                  make memories anywhere
                </p>
              </div>

              {/* 35mm Film Stock Selector (Black & White vs Grainy Warm Color) */}
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-medium text-[#e6ebf2]">
                  Select 35mm Film Finish
                </span>
                <FilmModeSelector
                  filmMode={filmMode}
                  onChangeFilmMode={setFilmMode}
                />
              </div>

              {/* Theme Switcher */}
              <div ref={themesSectionRef} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#e6ebf2]">
                    Select Strip Theme
                  </span>
                  <button
                    type="button"
                    onClick={handleShuffleStickers}
                    className="text-xs font-medium text-[#f7ca6d] hover:underline flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Shuffle Stickers
                  </button>
                </div>
                <ThemeSelector
                  selectedTheme={selectedTheme}
                  onSelectTheme={setSelectedTheme}
                />
              </div>

              {/* Primary & Secondary Actions */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleStepIntoBooth}
                  className="w-full sm:w-auto sm:min-w-[260px] min-h-[52px] px-7 py-3.5 rounded-2xl bg-[#f2b84b] text-[#0e131a] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-xl hover:bg-[#f7c463] active:scale-[0.99] transition-all whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" />
                  Step Into Booth
                </button>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => lobbyUploadRef.current?.click()}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#111822]/80 backdrop-blur-md border border-white/14 text-xs font-medium text-[#e9edf3] hover:text-white hover:border-white/28 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Upload 4 Photos from Library
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDevelopSample}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#111822]/80 backdrop-blur-md border border-white/14 text-xs font-medium text-[#e9edf3] hover:text-white hover:border-white/28 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Watch Sample Strip Develop
                  </button>

                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={() => openBetaModal('install')}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#111822]/80 backdrop-blur-md border border-white/14 text-xs font-medium text-[#e9edf3] hover:text-white hover:border-white/28 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#f2b84b]" />
                      Install on iPhone
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openBetaModal('share')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#111822]/80 backdrop-blur-md border border-white/14 text-xs font-medium text-[#e9edf3] hover:text-white hover:border-white/28 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#f2b84b]" />
                    Share Download Link
                  </button>
                </div>

                <input
                  ref={lobbyUploadRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleLobbyUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Right Column: Live Sample Strip Showcase + Floating Cutout Stickers */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full rounded-3xl bg-[#111822]/82 backdrop-blur-md border border-white/14 p-6 sm:p-8 flex flex-col items-center shadow-2xl">
                <div className="w-full flex items-center justify-between gap-2 text-xs text-[#cfd5de] mb-5">
                  <span>
                    Live Strip Preview · {filmMode === 'color' ? 'Color Film' : 'B&W Film'}
                  </span>
                  <button
                    type="button"
                    onClick={handleShuffleStickers}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/18 text-[#f6f4ef] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Shuffle className="w-3 h-3 text-[#f2b84b]" />
                    Shuffle
                  </button>
                </div>

                <div
                  className={`relative w-36 sm:w-44 ${previewAspectClass} flex items-center justify-center my-1`}
                >
                  <AnimatedThemeCharacters themeId={selectedTheme} seed={stickerSeed} />
                  {lobbyPreviewUrl ? (
                    <img
                      src={lobbyPreviewUrl}
                      alt={`Sample 4-photo strip showing ${activeThemeMeta.name} stickers`}
                      referrerPolicy="no-referrer"
                      className={`relative z-0 w-full h-auto rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.68)] transition-opacity duration-150 ${
                        isLobbyPreviewLoading ? 'opacity-60' : 'opacity-100'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full rounded-sm bg-[#182230]/80 border border-white/10 flex items-center justify-center text-xs text-[#cfd5de]">
                      Rendering Strip...
                    </div>
                  )}
                </div>

                <p className="mt-5 text-xs text-[#c6cdd7] text-center max-w-xs leading-relaxed">
                  {activeThemeMeta.description}
                </p>
              </div>
            </div>
          </section>
        )}

        {stage === BoothStage.Booth && (
          <BoothCamera
            selectedTheme={selectedTheme}
            filmMode={filmMode}
            onChangeFilmMode={setFilmMode}
            onCompleteFourFrames={beginChemicalDevelopment}
            onCancelBooth={() => setStage(BoothStage.Lobby)}
          />
        )}

        {stage === BoothStage.Developing && (
          <DevelopingChute
            unexposedStripUrl={unexposedStripUrl}
            developedStripUrl={developedStripUrl}
            filmMode={filmMode}
            onFinishedDeveloping={handleFinishDeveloping}
          />
        )}

        {stage === BoothStage.Result && (
          <DevelopedStripView
            stripDataUrl={developedStripUrl}
            selectedTheme={selectedTheme}
            filmMode={filmMode}
            canSwitchFilmMode={activeRawFrames.length === 4}
            customNote={customNote}
            stickerSeed={stickerSeed}
            isRenderingTheme={isRenderingTheme}
            onChangeTheme={setSelectedTheme}
            onChangeFilmMode={setFilmMode}
            onChangeCustomNote={setCustomNote}
            onShuffleStickers={handleShuffleStickers}
            onRetakeNewStrip={handleStepIntoBooth}
          />
        )}

        {/* Session Film Roll Tray */}
        {savedStrips.length > 0 && stage !== BoothStage.Developing && (
          <section
            ref={filmRollSectionRef}
            className="mt-16 pt-10 border-t border-white/14"
            aria-label="Developed Film Roll"
          >
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl font-medium text-[#f6f4ef]">
                  Recent Film Roll
                </h2>
                <p className="text-xs text-[#c6cdd7] mt-0.5">
                  Tap any developed strip to shuffle its stickers, switch themes, or save to Photos
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-[#c6cdd7]">
                {savedStrips.length} {savedStrips.length === 1 ? 'Strip' : 'Strips'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {savedStrips.map((item) => {
                const meta =
                  STRIP_THEMES.find((t) => t.id === item.themeId) || STRIP_THEMES[0];
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenSavedStrip(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenSavedStrip(item);
                      }
                    }}
                    className="group cursor-pointer rounded-2xl bg-[#111822]/82 backdrop-blur-md border border-white/12 hover:border-white/30 p-3.5 flex flex-col items-center transition-colors relative"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSavedStrip(item.id, e)}
                      aria-label="Remove strip from roll"
                      className="absolute top-2 right-2 min-h-[36px] min-w-[36px] rounded-lg bg-black/55 text-[#cfd5de] hover:text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <img
                      src={item.stripDataUrl}
                      alt={`Developed strip from ${item.createdAt}`}
                      referrerPolicy="no-referrer"
                      className="ios-saveable-image w-24 sm:w-28 h-auto rounded-xs shadow-lg"
                    />

                    <div className="mt-3 w-full text-center">
                      <p className="text-xs font-medium text-[#f6f4ef] truncate">
                        {meta.name}
                      </p>
                      <p className="text-[11px] font-mono-tabular text-[#b8c0ca] mt-0.5">
                        {item.createdAt} · {item.filmMode === 'color' ? 'Color' : 'B&W'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/12 bg-[#0f1620]/65 backdrop-blur-sm py-5 px-4 sm:px-6 text-xs text-[#c2c9d3]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>alcove · make memories anywhere</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => openBetaModal('share')}
              className="hover:text-[#f6f4ef] transition-colors whitespace-nowrap"
            >
              Send Beta Link to Friends
            </button>
            <span aria-hidden="true">·</span>
            <span>4-Pose Strip</span>
          </div>
        </div>
      </footer>

      <IOSGuideModal
        open={iosGuideOpen}
        initialTab={betaModalTab}
        onClose={() => setIosGuideOpen(false)}
      />
    </div>
  );
}
