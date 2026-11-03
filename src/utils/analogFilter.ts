import colorSampleGridUrl from '../assets/images/color_booth_poses_1793488840435.jpg';
import bwSampleGridUrl from '../assets/images/booth_pose_2_1793403454864.jpg';
import sampleFallback1 from '../assets/images/booth_pose_1_1793403453048.jpg';
import sampleFallback3 from '../assets/images/booth_pose_3_1793403455772.jpg';
import sampleFallback4 from '../assets/images/booth_pose_4_1793403456043.jpg';
import { FilmMode } from '../types/booth';

const TARGET_FRAME_W = 750;
const TARGET_FRAME_H = 900; // Authentic 1.5" x 1.8" (5:6) vertical analog photobooth frame proportion

export interface CropRegion {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

let meterCanvas: HTMLCanvasElement | null = null;

/**
 * Samples the live camera feed on a tiny 32x32 canvas to detect dark settings (0..255).
 */
export function measureVideoLuminance(video: HTMLVideoElement): number {
  if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
    return 128;
  }
  if (!meterCanvas) {
    meterCanvas = document.createElement('canvas');
    meterCanvas.width = 32;
    meterCanvas.height = 32;
  }
  const mCtx = meterCanvas.getContext('2d', { willReadFrequently: true });
  if (!mCtx) return 128;

  mCtx.drawImage(video, 0, 0, 32, 32);
  const pixels = mCtx.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  const count = pixels.length >> 2;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }
  return sum / Math.max(1, count);
}

/**
 * Gently lifts underexposed dark-room frames (like pushing 35mm film to ISO 1600)
 * so faces stay bright and clear even when standing farther back in dark settings.
 */
function applyAdaptiveNightPush(ctx: CanvasRenderingContext2D): void {
  const imgData = ctx.getImageData(0, 0, TARGET_FRAME_W, TARGET_FRAME_H);
  const data = imgData.data;

  // Measure center-weighted luminance where faces sit
  let sumLum = 0;
  let samples = 0;
  for (let y = Math.floor(TARGET_FRAME_H * 0.18); y < Math.floor(TARGET_FRAME_H * 0.82); y += 6) {
    for (let x = Math.floor(TARGET_FRAME_W * 0.18); x < Math.floor(TARGET_FRAME_W * 0.82); x += 6) {
      const idx = (y * TARGET_FRAME_W + x) * 4;
      sumLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      samples++;
    }
  }

  const avgLum = sumLum / Math.max(1, samples);
  if (avgLum >= 96) return; // Already well-lit

  // Compute smooth gamma & gain push proportional to darkness (strongest in very dark rooms)
  const darkness = Math.min(1, (96 - avgLum) / 76); // 0..1
  const gamma = 1 - darkness * 0.34; // down to ~0.66 gamma curve
  const gain = 1 + darkness * 0.28;

  const pushLut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const norm = i / 255;
    pushLut[i] = Math.min(255, Math.round(Math.pow(norm, gamma) * 255 * gain));
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i] = pushLut[data[i]];
    data[i + 1] = pushLut[data[i + 1]];
    data[i + 2] = pushLut[data[i + 2]];
  }

  ctx.putImageData(imgData, 0, 0);
}

function drawCroppedToCanvas(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options?: {
    mirrorHorizontal?: boolean;
    customCrop?: CropRegion;
    autoNightLift?: boolean;
  }
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_FRAME_W;
  canvas.height = TARGET_FRAME_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas, ctx: null };

  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth || TARGET_FRAME_W
      : source.width || TARGET_FRAME_W;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight || TARGET_FRAME_H
      : source.height || TARGET_FRAME_H;

  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;

  if (options?.customCrop) {
    ({ sx, sy, sw, sh } = options.customCrop);
  } else {
    const targetAspect = TARGET_FRAME_W / TARGET_FRAME_H;
    const srcAspect = srcW / srcH;
    if (srcAspect > targetAspect) {
      sw = srcH * targetAspect;
      sx = (srcW - sw) / 2;
    } else {
      sh = srcW / targetAspect;
      sy = (srcH - sh) / 2;
    }
  }

  ctx.save();
  if (options?.mirrorHorizontal) {
    ctx.translate(TARGET_FRAME_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, TARGET_FRAME_W, TARGET_FRAME_H);
  ctx.restore();

  if (options?.autoNightLift) {
    applyAdaptiveNightPush(ctx);
  }

  return { canvas, ctx };
}

/**
 * Captures a clean 1.5"x1.8" (750x900) cropped frame before film emulsion grading
 * so the user can also switch between B&W 35mm and Color 35mm after developing.
 */
export function captureRawBoothFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options?: {
    mirrorHorizontal?: boolean;
    customCrop?: CropRegion;
    autoNightLift?: boolean;
  }
): string {
  const { canvas, ctx } = drawCroppedToCanvas(source, options);
  if (!ctx) return '';
  return canvas.toDataURL('image/jpeg', 0.94);
}

/**
 * Applies either:
 * - 'bw': Pushed 35mm Tri-X / Model 11 dip-and-dunk black-and-white silver-halide emulsion
 * - 'color': Vintage 35mm C-41 Color Negative Film (Kodak Gold / Portra 800 direct-flash look)
 *   with warm analog color grading, lifted matte shadows, clumped film grain + subtle RGB dye grain,
 *   direct xenon flash vignette falloff, and micro dust specks.
 */
export function processAnalogFilmFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options?: {
    filmMode?: FilmMode;
    mirrorHorizontal?: boolean;
    customCrop?: CropRegion;
    autoNightLift?: boolean;
  }
): string {
  const filmMode: FilmMode = options?.filmMode ?? 'bw';
  const { canvas, ctx } = drawCroppedToCanvas(source, options);
  if (!ctx) return '';

  // Coarse half-resolution grain map so grain clumps feel like genuine 35mm emulsion
  const coarseW = TARGET_FRAME_W >> 1;
  const coarseH = TARGET_FRAME_H >> 1;
  const coarseGrain = new Float32Array(coarseW * coarseH);
  const coarseStrength = filmMode === 'bw' ? 34 : 31;
  for (let i = 0; i < coarseGrain.length; i++) {
    coarseGrain[i] = (Math.random() + Math.random() - 1) * coarseStrength;
  }

  const imgData = ctx.getImageData(0, 0, TARGET_FRAME_W, TARGET_FRAME_H);
  const data = imgData.data;

  // Tonal S-curve LUTs
  const bwLut = new Uint8ClampedArray(256);
  const colorLutR = new Uint8ClampedArray(256);
  const colorLutG = new Uint8ClampedArray(256);
  const colorLutB = new Uint8ClampedArray(256);

  if (filmMode === 'bw') {
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      const lifted = Math.pow(x, 0.93);
      const contrast =
        lifted < 0.5
          ? 0.5 * Math.pow(2 * lifted, 1.34)
          : 1 - 0.5 * Math.pow(2 * (1 - lifted), 1.28);
      bwLut[i] = Math.round(12 + contrast * 240);
    }
  } else {
    // Authentic C-41 35mm Color Film Curve (warm golden flash highlights + lifted matte shadows)
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      const sCurve =
        x < 0.5
          ? 0.5 * Math.pow(2 * x, 1.18)
          : 1 - 0.5 * Math.pow(2 * (1 - x), 1.15);

      // Warm highlights on Red, balanced creamy midtones on Green, vintage shadow lift + soft highlight roll on Blue
      const rCurve = Math.pow(sCurve, 0.93);
      const gCurve = Math.pow(sCurve, 0.97);
      const bCurve = Math.pow(sCurve, 1.04);

      colorLutR[i] = Math.min(255, Math.round(11 + rCurve * 244));
      colorLutG[i] = Math.min(255, Math.round(10 + gCurve * 240));
      colorLutB[i] = Math.min(255, Math.round(14 + bCurve * 230));
    }
  }

  const centerX = TARGET_FRAME_W * 0.5;
  const centerY = TARGET_FRAME_H * 0.46;
  const maxDist = Math.hypot(centerX, TARGET_FRAME_H * 0.54);

  for (let y = 0; y < TARGET_FRAME_H; y++) {
    const dy = y - centerY;
    const cy = y >> 1;
    const cyNext = Math.min(coarseH - 1, cy + 1);
    const wy = (y & 1) * 0.5;

    for (let x = 0; x < TARGET_FRAME_W; x++) {
      const idx = (y * TARGET_FRAME_W + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const cx = x >> 1;
      const cxNext = Math.min(coarseW - 1, cx + 1);
      const wx = (x & 1) * 0.5;

      const g00 = coarseGrain[cy * coarseW + cx];
      const g10 = coarseGrain[cy * coarseW + cxNext];
      const g01 = coarseGrain[cyNext * coarseW + cx];
      const g11 = coarseGrain[cyNext * coarseW + cxNext];
      const clump =
        g00 * (1 - wx) * (1 - wy) +
        g10 * wx * (1 - wy) +
        g01 * (1 - wx) * wy +
        g11 * wx * wy;

      const dist = Math.hypot(x - centerX, dy) / maxDist;
      const vig =
        dist > 0.48
          ? 1 - Math.pow((dist - 0.48) / 0.62, 1.7) * (filmMode === 'bw' ? 0.36 : 0.30)
          : 1;

      if (filmMode === 'bw') {
        const lum = Math.round(0.33 * r + 0.55 * g + 0.12 * b);
        const toned = Math.max(8, Math.round(bwLut[lum] * vig));
        const fine = (Math.random() + Math.random() - 1) * 24;

        const highlightRoll = toned > 220 ? 1 - ((toned - 220) / 45) * 0.55 : 1;
        const shadowBoost = toned < 65 ? 0.78 + (toned / 65) * 0.22 : 1;
        const totalGrain = (clump * 0.72 + fine * 0.58) * highlightRoll * shadowBoost;

        const finalVal = Math.max(0, Math.min(255, Math.round(toned + totalGrain)));
        data[idx] = Math.min(255, finalVal + 2);
        data[idx + 1] = Math.min(255, finalVal + 1);
        data[idx + 2] = Math.max(0, finalVal - 1);
        data[idx + 3] = 255;
      } else {
        // Gentle analog dye saturation boost (1.13x) around perceptual luminance before C-41 curve
        const baseLum = 0.299 * r + 0.587 * g + 0.114 * b;
        const satFactor = 1.13;
        const sr = Math.max(0, Math.min(255, Math.round(baseLum + (r - baseLum) * satFactor)));
        const sg = Math.max(0, Math.min(255, Math.round(baseLum + (g - baseLum) * satFactor)));
        const sb = Math.max(0, Math.min(255, Math.round(baseLum + (b - baseLum) * satFactor)));

        const tr = colorLutR[sr] * vig;
        const tg = colorLutG[sg] * vig;
        const tb = colorLutB[sb] * vig;

        const avgTone = (tr + tg + tb) * 0.333;
        const fine = (Math.random() + Math.random() - 1) * 21;
        const highlightRoll = avgTone > 222 ? 1 - ((avgTone - 222) / 45) * 0.55 : 1;
        const shadowBoost = avgTone < 65 ? 0.8 + (avgTone / 65) * 0.2 : 1;
        const lumGrain = (clump * 0.68 + fine * 0.55) * highlightRoll * shadowBoost;

        // Subtle organic C-41 color dye-cloud grain per channel
        const dyeR = (Math.random() - 0.5) * 11 * highlightRoll;
        const dyeG = (Math.random() - 0.5) * 9 * highlightRoll;
        const dyeB = (Math.random() - 0.5) * 13 * highlightRoll;

        data[idx] = Math.max(0, Math.min(255, Math.round(tr + lumGrain + dyeR)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(tg + lumGrain + dyeG)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(tb + lumGrain + dyeB)));
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Authentic micro analog film dust specks & tiny emulsion fibers
  ctx.save();
  const speckCount = filmMode === 'bw' ? 38 : 30;
  for (let s = 0; s < speckCount; s++) {
    const sxPos = Math.random() * TARGET_FRAME_W;
    const syPos = Math.random() * TARGET_FRAME_H;
    const radius = 0.5 + Math.random() * 1.05;
    ctx.fillStyle =
      Math.random() > 0.25
        ? `rgba(252, 246, 236, ${0.13 + Math.random() * 0.2})`
        : `rgba(14, 11, 12, ${0.16 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(sxPos, syPos, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}

// Alias preserved for compatibility
export function processAnalogBWFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options?: {
    mirrorHorizontal?: boolean;
    customCrop?: CropRegion;
  }
): string {
  return processAnalogFilmFrame(source, { ...options, filmMode: 'bw' });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function developRawFramesWithFilmMode(
  rawFrames: string[],
  filmMode: FilmMode
): Promise<string[]> {
  const imgs = await Promise.all(rawFrames.slice(0, 4).map((src) => loadImageElement(src)));
  return imgs.map((img) => processAnalogFilmFrame(img, { filmMode }));
}

function createFallbackSilhouetteFrame(poseIndex: number, filmMode: FilmMode): string {
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_FRAME_W;
  canvas.height = TARGET_FRAME_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createRadialGradient(
    TARGET_FRAME_W * 0.5,
    TARGET_FRAME_H * 0.45,
    60,
    TARGET_FRAME_W * 0.5,
    TARGET_FRAME_H * 0.5,
    TARGET_FRAME_W * 0.65
  );
  grad.addColorStop(0, filmMode === 'color' ? '#6D2936' : '#444248');
  grad.addColorStop(1, filmMode === 'color' ? '#1E0D12' : '#100F12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TARGET_FRAME_W, TARGET_FRAME_H);

  for (let x = 0; x < TARGET_FRAME_W; x += 48) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, 0, 18, TARGET_FRAME_H);
  }

  ctx.fillStyle = filmMode === 'color' ? '#F3CFA9' : '#E6E3DC';
  const offset = (poseIndex % 2 === 0 ? -1 : 1) * 16;
  ctx.beginPath();
  ctx.arc(TARGET_FRAME_W * 0.5 + offset, TARGET_FRAME_H * 0.4, 112, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = filmMode === 'color' ? '#C96A2B' : '#E6E3DC';
  ctx.beginPath();
  ctx.ellipse(
    TARGET_FRAME_W * 0.5 + offset,
    TARGET_FRAME_H * 0.88,
    205,
    210,
    0,
    Math.PI,
    0
  );
  ctx.fill();

  return processAnalogFilmFrame(canvas, { filmMode });
}

let cachedRawSampleFrames: string[] | null = null;
const cachedSampleFramesByMode: Partial<Record<FilmMode, string[]>> = {};

export async function loadSampleRawAndProcessedFrames(
  filmMode: FilmMode = 'bw'
): Promise<{ rawFrames: string[]; processedFrames: string[] }> {
  if (!cachedRawSampleFrames) {
    try {
      const gridImg = await loadImageElement(colorSampleGridUrl);
      const w = gridImg.naturalWidth || gridImg.width;
      const h = gridImg.naturalHeight || gridImg.height;

      const padOuterX = w * 0.02;
      const padOuterY = h * 0.02;
      const padInnerX = w * 0.015;
      const padInnerY = h * 0.015;

      const quadW = w * 0.5 - padOuterX - padInnerX;
      const quadH = h * 0.5 - padOuterY - padInnerY;

      const crops: CropRegion[] = [
        { sx: padOuterX, sy: padOuterY, sw: quadW, sh: quadH },
        { sx: w * 0.5 + padInnerX, sy: padOuterY, sw: quadW, sh: quadH },
        { sx: padOuterX, sy: h * 0.5 + padInnerY, sw: quadW, sh: quadH },
        { sx: w * 0.5 + padInnerX, sy: h * 0.5 + padInnerY, sw: quadW, sh: quadH },
      ];

      cachedRawSampleFrames = crops.map((crop) =>
        captureRawBoothFrame(gridImg, { customCrop: crop })
      );
    } catch {
      try {
        const bwGrid = await loadImageElement(bwSampleGridUrl);
        const w = bwGrid.naturalWidth || bwGrid.width;
        const h = bwGrid.naturalHeight || bwGrid.height;
        const quadW = w * 0.44;
        const quadH = h * 0.44;
        const crops: CropRegion[] = [
          { sx: w * 0.035, sy: h * 0.035, sw: quadW, sh: quadH },
          { sx: w * 0.525, sy: h * 0.035, sw: quadW, sh: quadH },
          { sx: w * 0.035, sy: h * 0.525, sw: quadW, sh: quadH },
          { sx: w * 0.525, sy: h * 0.525, sw: quadW, sh: quadH },
        ];
        cachedRawSampleFrames = crops.map((crop) =>
          captureRawBoothFrame(bwGrid, { customCrop: crop })
        );
      } catch {
        const urls = [sampleFallback1, sampleFallback3, sampleFallback4, sampleFallback1];
        const imgs = await Promise.all(urls.map((u) => loadImageElement(u)));
        cachedRawSampleFrames = imgs.map((img) => captureRawBoothFrame(img));
      }
    }
  }

  const rawFrames = cachedRawSampleFrames || [];
  const existing = cachedSampleFramesByMode[filmMode];
  if (existing && existing.length === 4) {
    return { rawFrames, processedFrames: existing };
  }

  try {
    const processed = await developRawFramesWithFilmMode(rawFrames, filmMode);
    cachedSampleFramesByMode[filmMode] = processed;
    return { rawFrames, processedFrames: processed };
  } catch {
    const fallback = [0, 1, 2, 3].map((i) => createFallbackSilhouetteFrame(i, filmMode));
    cachedSampleFramesByMode[filmMode] = fallback;
    return { rawFrames: fallback, processedFrames: fallback };
  }
}

export async function loadSampleFrames(filmMode: FilmMode = 'bw'): Promise<string[]> {
  const { processedFrames } = await loadSampleRawAndProcessedFrames(filmMode);
  return processedFrames;
}

export async function processUploadedFilesToFrames(
  files: FileList | File[],
  filmMode: FilmMode = 'bw'
): Promise<{ rawFrames: string[]; processedFrames: string[] }> {
  const list = Array.from(files).slice(0, 4);
  if (list.length === 0) return { rawFrames: [], processedFrames: [] };

  const rawFrames: string[] = [];
  const processedFrames: string[] = [];

  for (const file of list) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(objectUrl);
      rawFrames.push(captureRawBoothFrame(img));
      processedFrames.push(processAnalogFilmFrame(img, { filmMode }));
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  while (rawFrames.length > 0 && rawFrames.length < 4) {
    const idx = rawFrames.length % list.length;
    rawFrames.push(rawFrames[idx]);
    processedFrames.push(processedFrames[idx]);
  }

  return { rawFrames, processedFrames };
}
