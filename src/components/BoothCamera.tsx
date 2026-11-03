import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
} from 'lucide-react';
import {
  FilmMode,
  FlashMode,
  MirrorMode,
  STRIP_THEMES,
  StripThemeId,
} from '../types/booth';
import {
  captureRawBoothFrame,
  loadSampleRawAndProcessedFrames,
  measureVideoLuminance,
  processAnalogFilmFrame,
  processUploadedFilesToFrames,
} from '../utils/analogFilter';
import { boothSound } from '../utils/soundFx';
import { FilmModeSelector } from './FilmModeSelector';

export interface CompletedRollPayload {
  rawFrames: string[];
  processedFrames: string[];
}

interface BoothCameraProps {
  selectedTheme: StripThemeId;
  filmMode: FilmMode;
  onChangeFilmMode: (mode: FilmMode) => void;
  onCompleteFourFrames: (payload: CompletedRollPayload) => void;
  onCancelBooth: () => void;
}

type TorchCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
};

type TorchConstraintSet = MediaTrackConstraintSet & {
  torch?: boolean;
};

export const BoothCamera: React.FC<BoothCameraProps> = ({
  selectedTheme,
  filmMode,
  onChangeFilmMode,
  onCompleteFourFrames,
  onCancelBooth,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sequenceAbortRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mirrorMode, setMirrorMode] = useState<MirrorMode>('smoked-mirror');
  const [flashMode, setFlashMode] = useState<FlashMode>('auto');
  const [shotDelaySec, setShotDelaySec] = useState<3 | 5>(3);
  const [soundOn, setSoundOn] = useState(true);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLowLight, setIsLowLight] = useState(false);
  const [supportsHardwareTorch, setSupportsHardwareTorch] = useState(false);

  const [isShooting, setIsShooting] = useState(false);
  const [currentPoseIndex, setCurrentPoseIndex] = useState<number>(0); // 0..3
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [exposedCount, setExposedCount] = useState<number>(0);
  const [isLoadingAlt, setIsLoadingAlt] = useState(false);

  const activeThemeMeta =
    STRIP_THEMES.find((t) => t.id === selectedTheme) || STRIP_THEMES[0];

  const setHardwareTorch = useCallback(async (enabled: boolean) => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') return;

    try {
      const caps =
        typeof track.getCapabilities === 'function'
          ? (track.getCapabilities() as TorchCapabilities)
          : null;
      if (caps && caps.torch) {
        const advanced: TorchConstraintSet[] = [{ torch: enabled }];
        await track.applyConstraints({ advanced });
      }
    } catch {
      // Ignore if iOS/browser blocks runtime torch constraint
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setSupportsHardwareTorch(false);
  }, []);

  const initCamera = useCallback(
    async (mode: 'user' | 'environment') => {
      stopStream();
      setCameraReady(false);
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Camera access is unavailable in this browser context. You can upload 4 photos from your iPhone Photo Library or develop a sample roll below.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1000 },
            height: { ideal: 1200 },
          },
        });
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          try {
            const caps = track.getCapabilities() as TorchCapabilities;
            setSupportsHardwareTorch(Boolean(caps.torch));
          } catch {
            setSupportsHardwareTorch(false);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Essential for iOS Safari inline playback
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        setCameraError(
          'Camera permission was declined or unavailable. Allow Camera in Safari settings, or choose 4 photos from your Photo Library below.'
        );
      }
    },
    [stopStream]
  );

  useEffect(() => {
    sequenceAbortRef.current = false;
    initCamera(facingMode);
    return () => {
      sequenceAbortRef.current = true;
      stopStream();
    };
  }, [facingMode, initCamera, stopStream]);

  // Real-time ambient light metering for Dark-Setting Auto Flash & Ring Light
  useEffect(() => {
    if (!cameraReady || isShooting) return;

    const checkAmbient = () => {
      if (!videoRef.current) return;
      const lum = measureVideoLuminance(videoRef.current);
      setIsLowLight(lum < 78);
    };

    checkAmbient();
    const intervalId = window.setInterval(checkAmbient, 900);
    return () => window.clearInterval(intervalId);
  }, [cameraReady, isShooting]);

  // If rear camera supports continuous torch and user explicitly sets Flash ON, keep modeling torch ready during shooting
  useEffect(() => {
    if (!cameraReady || !supportsHardwareTorch) return;
    if (flashMode === 'on' && isShooting) {
      setHardwareTorch(true);
    } else if (flashMode === 'off') {
      setHardwareTorch(false);
    }
  }, [cameraReady, supportsHardwareTorch, flashMode, isShooting, setHardwareTorch]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    boothSound.enabled = next;
    if (next) boothSound.unlock();
  };

  const cycleFlashMode = () => {
    setFlashMode((prev) => {
      if (prev === 'auto') return 'on';
      if (prev === 'on') return 'off';
      return 'auto';
    });
  };

  const handleFlipCamera = () => {
    if (isShooting) return;
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // Night Ring Light turns on when Flash is explicitly ON, or when Auto detects a dark room
  const nightRingActive =
    cameraReady &&
    !cameraError &&
    (flashMode === 'on' || (flashMode === 'auto' && isLowLight));

  const startFourPoseSequence = async () => {
    if (!videoRef.current || !cameraReady || isShooting) return;

    boothSound.enabled = soundOn;
    boothSound.unlock();
    sequenceAbortRef.current = false;
    setIsShooting(true);
    setExposedCount(0);

    const rawFrames: string[] = [];
    const processedFrames: string[] = [];
    const useDarkRoomFlash = flashMode === 'on' || (flashMode === 'auto' && isLowLight);

    for (let pose = 0; pose < 4; pose++) {
      if (sequenceAbortRef.current) {
        await setHardwareTorch(false);
        return;
      }
      setCurrentPoseIndex(pose);

      for (let sec: number = shotDelaySec; sec >= 1; sec--) {
        if (sequenceAbortRef.current) {
          await setHardwareTorch(false);
          return;
        }
        setCountdown(sec);
        boothSound.playCountdownTick(sec === 1);
        await sleep(950);
      }

      if (sequenceAbortRef.current) {
        await setHardwareTorch(false);
        return;
      }
      setCountdown(0);

      const mirrorHorizontal = facingMode === 'user';

      if (useDarkRoomFlash) {
        // DARK-SETTING RETINA / TORCH FLASH:
        // 1. Fire full-viewport warm-white Retina Screen Flash + rear LED Torch BEFORE capturing
        //    so the phone screen physically lights up faces in dark rooms and the camera ISP settles!
        if (supportsHardwareTorch) {
          await setHardwareTorch(true);
        }
        setFlashActive(true);
        await sleep(390);

        if (sequenceAbortRef.current) {
          setFlashActive(false);
          await setHardwareTorch(false);
          return;
        }

        // 2. Snap shutter at peak physical illumination + adaptive night ISO push
        boothSound.playXenonShutter();
        const rawUrl = captureRawBoothFrame(videoRef.current, {
          mirrorHorizontal,
          autoNightLift: true,
        });
        const filmUrl = processAnalogFilmFrame(videoRef.current, {
          filmMode,
          mirrorHorizontal,
          autoNightLift: true,
        });

        rawFrames.push(rawUrl);
        processedFrames.push(filmUrl);
        setExposedCount(pose + 1);

        await sleep(90);
        setFlashActive(false);
        if (supportsHardwareTorch && flashMode !== 'on') {
          await setHardwareTorch(false);
        }
      } else if (flashMode === 'off') {
        // Flash explicitly OFF: no bright white burst, still apply gentle low-light shadow lift if dim
        boothSound.playXenonShutter();
        const rawUrl = captureRawBoothFrame(videoRef.current, {
          mirrorHorizontal,
          autoNightLift: isLowLight,
        });
        const filmUrl = processAnalogFilmFrame(videoRef.current, {
          filmMode,
          mirrorHorizontal,
          autoNightLift: isLowLight,
        });

        rawFrames.push(rawUrl);
        processedFrames.push(filmUrl);
        setExposedCount(pose + 1);
        await sleep(170);
      } else {
        // Standard well-lit Auto Flash: crisp xenon shutter pulse
        setFlashActive(true);
        boothSound.playXenonShutter();

        const rawUrl = captureRawBoothFrame(videoRef.current, { mirrorHorizontal });
        const filmUrl = processAnalogFilmFrame(videoRef.current, {
          filmMode,
          mirrorHorizontal,
        });

        rawFrames.push(rawUrl);
        processedFrames.push(filmUrl);
        setExposedCount(pose + 1);

        await sleep(170);
        setFlashActive(false);
      }

      setCountdown(null);

      // Brief recycle pause before next pose
      if (pose < 3) {
        await sleep(850);
      } else {
        await sleep(450);
      }
    }

    await setHardwareTorch(false);

    if (!sequenceAbortRef.current && processedFrames.length === 4) {
      stopStream();
      onCompleteFourFrames({ rawFrames, processedFrames });
    }
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsLoadingAlt(true);
    boothSound.unlock();
    try {
      const payload = await processUploadedFilesToFrames(files, filmMode);
      if (payload.processedFrames.length === 4) {
        stopStream();
        onCompleteFourFrames(payload);
      }
    } finally {
      setIsLoadingAlt(false);
      e.target.value = '';
    }
  };

  const handleUseSampleRoll = async () => {
    setIsLoadingAlt(true);
    boothSound.unlock();
    try {
      const payload = await loadSampleRawAndProcessedFrames(filmMode);
      stopStream();
      onCompleteFourFrames(payload);
    } finally {
      setIsLoadingAlt(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Ambient Screen Fill Glow when Night Ring Light is active in dark settings */}
      {nightRingActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-20 border-[14px] sm:border-[22px] border-[#fffaf0]/90 shadow-[inset_0_0_90px_rgba(255,250,240,0.55)] transition-opacity duration-300"
        />
      )}

      {/* Velvet Curtain Booth Header */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-30">
        <div className="text-xs text-[#cbc3b7] flex items-center gap-2 min-w-0">
          <span className="text-[#f5f2eb] font-medium truncate">
            {activeThemeMeta.name}
          </span>
          <span aria-hidden="true" className="shrink-0">
            ·
          </span>
          <span className="shrink-0">
            {filmMode === 'color' ? 'Color Film' : 'B&W Film'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dark-Room Flash Selector (Auto / On / Off) */}
          <button
            type="button"
            onClick={cycleFlashMode}
            aria-label={`Flash mode: ${flashMode}. Tap to switch flash mode.`}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 backdrop-blur-md ${
              flashMode === 'on'
                ? 'bg-[#fff7e6] border-[#fff7e6] text-[#0e131a] shadow-[0_0_16px_rgba(255,247,230,0.45)]'
                : flashMode === 'auto'
                  ? 'bg-[#17212e]/90 border-[#f2b84b]/60 text-[#f6f4ef] hover:border-[#f2b84b]'
                  : 'bg-[#121923]/85 border-white/12 text-[#9ea7b3] hover:text-[#f6f4ef]'
            }`}
          >
            {flashMode === 'off' ? (
              <ZapOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Zap
                className={`w-3.5 h-3.5 shrink-0 ${
                  flashMode === 'on' ? 'text-[#d99316] fill-[#d99316]' : 'text-[#f2b84b]'
                }`}
              />
            )}
            <span>
              {flashMode === 'on'
                ? 'Flash On'
                : flashMode === 'auto'
                  ? isLowLight
                    ? 'Auto (Night)'
                    : 'Flash Auto'
                  : 'Flash Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute shutter sound' : 'Unmute shutter sound'}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#16141b]/85 backdrop-blur-md border border-white/12 flex items-center justify-center text-[#d8d3c8] hover:text-white transition-colors"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {!isShooting && (
            <button
              type="button"
              onClick={handleFlipCamera}
              aria-label="Flip front or rear camera"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#16141b]/85 backdrop-blur-md border border-white/12 flex items-center justify-center text-[#d8d3c8] hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Physical Booth Mirror Plate & Indicator Lamp Housing */}
      <div
        className={`relative z-30 rounded-3xl backdrop-blur-md p-4 sm:p-5 shadow-2xl overflow-hidden transition-all duration-300 ${
          nightRingActive
            ? 'bg-[#1a161f]/92 border-2 border-[#fffaf0]/85 shadow-[0_0_50px_rgba(255,250,240,0.28)]'
            : 'bg-[#141117]/88 border border-white/15'
        }`}
      >
        {/* Top Analog Red Indicator Lamp ("LOOK HERE") */}
        <div className="flex items-center justify-between gap-3 mb-3.5 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-3 h-3 rounded-full shrink-0 transition-opacity duration-150 ${
                isShooting
                  ? 'bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.85)]'
                  : 'bg-[#522424]'
              }`}
              aria-hidden="true"
            />
            <span className="text-xs font-mono-tabular tracking-wide text-[#d8d3c8] truncate">
              {isShooting
                ? `POSE 0${currentPoseIndex + 1} OF 04 — LOOK AT LENS`
                : nightRingActive
                  ? 'NIGHT FLASH & RING LIGHT ACTIVE'
                  : 'READY · ALIGN IN BOOTH GLASS'}
            </span>
          </div>

          <span className="text-xs font-mono-tabular text-[#a9a296] shrink-0">
            {shotDelaySec}S TIMER
          </span>
        </div>

        {/* 1.5" x 1.8" (5:6 Vertical) Optical Booth Mirror Frame */}
        <div
          className={`relative aspect-[5/6] w-full max-w-[330px] sm:max-w-[360px] mx-auto rounded-2xl overflow-hidden bg-[#09080b] transition-all duration-300 ${
            nightRingActive
              ? 'border-[10px] border-[#fffdf8] shadow-[0_0_40px_rgba(255,252,242,0.55)]'
              : 'border border-white/15'
          }`}
        >
          {/* Live Camera Stream (iOS playsInline + muted) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              facingMode === 'user' ? '-scale-x-100' : ''
            } ${
              !cameraReady
                ? 'opacity-0'
                : mirrorMode === 'blind-curtain'
                  ? 'opacity-10 blur-xl grayscale contrast-125'
                  : filmMode === 'color'
                    ? nightRingActive
                      ? 'opacity-80 saturate-95 contrast-105 brightness-110'
                      : 'opacity-60 saturate-90 contrast-110 brightness-90'
                    : nightRingActive
                      ? 'opacity-75 grayscale contrast-115 brightness-115'
                      : 'opacity-55 grayscale contrast-125 brightness-90'
            }`}
          />

          {/* Smoked One-Way Mirror Optical Crosshair Overlay */}
          {cameraReady && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/30 via-transparent to-black/50">
              {/* Subtle analog booth framing brackets */}
              <div className="w-44 h-44 sm:w-52 sm:h-52 border border-white/25 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/35" />
              </div>

              {mirrorMode === 'blind-curtain' && !isShooting && (
                <p className="mt-3 text-xs text-[#d8d3c8] bg-black/60 px-3 py-1 rounded-md">
                  Blind Glass Active — True Unseen Analog Mode
                </p>
              )}
            </div>
          )}

          {/* Large Analog Countdown Overlay */}
          {isShooting && countdown !== null && countdown > 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/20">
              <span className="font-display text-7xl sm:text-8xl font-semibold text-[#f5f2eb] font-mono-tabular drop-shadow-lg">
                {countdown}
              </span>
              <span className="text-xs font-mono-tabular text-[#f5f2eb]/90 mt-2 tracking-widest">
                FRAME 0{currentPoseIndex + 1}
              </span>
            </div>
          )}

          {/* Between-shots cassette advance message (NO PHOTO PREVIEW!) */}
          {isShooting && countdown === null && !flashActive && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/65">
              <span className="text-sm font-medium text-[#f5f2eb]">
                Frame 0{exposedCount} Sealed in Darkroom Cassette
              </span>
              <span className="text-xs text-[#a9a296] mt-1">
                {exposedCount < 4
                  ? 'Get ready for next pose...'
                  : 'Sending strip to chemical bath...'}
              </span>
            </div>
          )}

          {/* Camera Error / Fallback State inside frame */}
          {cameraError && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-[#0f151e]">
              <Camera className="w-8 h-8 text-[#f2b84b] mb-3" />
              <p className="text-sm font-medium text-[#f6f4ef] max-w-sm">
                Live Booth Lens Unavailable
              </p>
              <p className="text-xs text-[#a9b2be] mt-1.5 max-w-sm leading-relaxed">
                {cameraError}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingAlt}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#f2b84b] text-[#0e131a] font-semibold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 hover:bg-[#f7c463] transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  Select 4 Photos
                </button>
                <button
                  type="button"
                  onClick={handleUseSampleRoll}
                  disabled={isLoadingAlt}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 text-[#f5f2eb] font-medium text-xs flex items-center gap-2 whitespace-nowrap shrink-0 hover:bg-white/15 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Develop Sample Roll
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Full-Viewport Warm-Xenon Retina Screen Flash (illuminates faces in dark settings BEFORE shutter read!) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-50 bg-[#fffdf8] transition-opacity duration-75 flex items-center justify-center ${
            flashActive ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-[#f2b84b]/40" />
        </div>

        {/* 4 Sealed Film Cassette Slots — Never reveals photos before developing */}
        <div className="mt-4 grid grid-cols-4 gap-2" aria-label="Film strip exposure progress">
          {[0, 1, 2, 3].map((slot) => {
            const isExposed = slot < exposedCount;
            const isCurrent = isShooting && slot === currentPoseIndex && !isExposed;
            return (
              <div
                key={slot}
                className={`h-12 rounded-xl border px-2.5 flex flex-col justify-center transition-colors ${
                  isExposed
                    ? 'bg-[#1a2432] border-[#f2b84b]/60 text-[#f6f4ef]'
                    : isCurrent
                      ? 'bg-[#151e2a] border-white/30 text-[#f6f4ef]'
                      : 'bg-[#0c1118] border-white/8 text-[#7c8591]'
                }`}
              >
                <span className="text-[11px] font-mono-tabular font-medium">
                  0{slot + 1}
                </span>
                <span className="text-[10px] truncate">
                  {isExposed ? 'Exposed' : isCurrent ? 'Posing' : 'Unexposed'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pre-Shot Controls & Primary Shutter Trigger */}
        {!isShooting ? (
          <div className="mt-4 space-y-3">
            {/* Film Stock, Mirror Glass & Timer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FilmModeSelector
                filmMode={filmMode}
                onChangeFilmMode={onChangeFilmMode}
                compact
              />

              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d0c10] border border-white/10">
                <button
                  type="button"
                  onClick={() => setMirrorMode('smoked-mirror')}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                    mirrorMode === 'smoked-mirror'
                      ? 'bg-[#25212c] text-[#f5f2eb]'
                      : 'text-[#9d968b] hover:text-[#f5f2eb]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Mirror
                </button>
                <button
                  type="button"
                  onClick={() => setMirrorMode('blind-curtain')}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                    mirrorMode === 'blind-curtain'
                      ? 'bg-[#25212c] text-[#f5f2eb]'
                      : 'text-[#9d968b] hover:text-[#f5f2eb]'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Blind
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d0c10] border border-white/10">
                <button
                  type="button"
                  onClick={() => setShotDelaySec(3)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular font-medium whitespace-nowrap shrink-0 transition-colors ${
                    shotDelaySec === 3
                      ? 'bg-[#25212c] text-[#f5f2eb]'
                      : 'text-[#9d968b] hover:text-[#f5f2eb]'
                  }`}
                >
                  3s
                </button>
                <button
                  type="button"
                  onClick={() => setShotDelaySec(5)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular font-medium whitespace-nowrap shrink-0 transition-colors ${
                    shotDelaySec === 5
                      ? 'bg-[#25212c] text-[#f5f2eb]'
                      : 'text-[#9d968b] hover:text-[#f5f2eb]'
                  }`}
                >
                  5s
                </button>
              </div>
            </div>

            {/* Primary Trigger in Mobile Thumb Zone */}
            <button
              type="button"
              disabled={!cameraReady || isLoadingAlt}
              onClick={startFourPoseSequence}
              className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-[#f2b84b] text-[#0e131a] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg hover:bg-[#f7c463] active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
            >
              <Camera className="w-4 h-4" />
              Take 4 Booth Photos
            </button>

            {/* Secondary Options: Photo Library Upload (iOS Camera Roll) or Sample Roll */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingAlt}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#1c1922] border border-white/10 text-xs font-medium text-[#d8d3c8] hover:text-white hover:border-white/20 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload 4 Photos
              </button>

              <button
                type="button"
                onClick={handleUseSampleRoll}
                disabled={isLoadingAlt}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#1c1922] border border-white/10 text-xs font-medium text-[#d8d3c8] hover:text-white hover:border-white/20 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Try Sample Strip
              </button>

              <button
                type="button"
                onClick={onCancelBooth}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-[#9d968b] hover:text-[#f5f2eb] transition-colors whitespace-nowrap shrink-0"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3 py-2 px-1">
            <span className="text-xs text-[#a9a296]">
              Hold your pose as each flash fires — photos develop at the end.
            </span>
            <button
              type="button"
              onClick={() => {
                sequenceAbortRef.current = true;
                setFlashActive(false);
                setHardwareTorch(false);
                setIsShooting(false);
                setCountdown(null);
                setExposedCount(0);
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/8 text-xs font-medium text-[#d8d3c8] hover:bg-white/15 whitespace-nowrap shrink-0"
            >
              Cancel Roll
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUploadPhotos}
          className="hidden"
        />
      </div>
    </div>
  );
};
