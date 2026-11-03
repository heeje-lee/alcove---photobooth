import { STRIP_THEMES, StripThemeId, formatCurrentStripDate } from '../types/booth';
import {
  ProcessedSticker,
  getProcessedStickerByDef,
  getThemeStickerDefinitions,
  loadCachedImage,
  loadThemeBackgroundImage,
} from './stickerAssets';

const STRIP_W = 840; // ~2.0" physical strip width at 420 DPI
const BORDER_X = 105; // ~0.25" side border margins
const FRAME_W = STRIP_W - BORDER_X * 2; // 630px = exact 1.5" at 420 DPI
const FRAME_H = 756; // 756px = exact 1.8" at 420 DPI (1.5" x 1.8" / 5:6 vertical ratio)
const HEADER_H = 152;
const GAP_H = 38;
const FOOTER_Y = HEADER_H + FRAME_H * 4 + GAP_H * 3; // 3290px
const SCENIC_FOOTER_H = 700; // Fits full bottom character scenes + date stamp
const CLASSIC_FOOTER_H = 266;

export function getStripDimensions(themeId: StripThemeId): { width: number; height: number } {
  const footerH = themeId === 'classic-noir' ? CLASSIC_FOOTER_H : SCENIC_FOOTER_H;
  return {
    width: STRIP_W,
    height: FOOTER_Y + footerH,
  };
}

// Seeded PRNG so unexposed & developed strips match, while Shuffle gives a brand-new organic layout
function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawSubtlePaperGrain(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  seed: number,
  intensity = 1
): void {
  const rng = createRng(seed + 101);
  ctx.save();
  const count = Math.round(1400 * intensity);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle =
      i % 3 === 0
        ? `rgba(16, 22, 28, ${(0.026 * intensity).toFixed(3)})`
        : `rgba(255, 252, 244, ${(0.032 * intensity).toFixed(3)})`;
    ctx.fillRect(rng() * stripW, rng() * stripH, 2, 2);
  }
  ctx.restore();
}

function drawFourPointStarSticker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  fill: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.save();
  ctx.shadowColor = 'rgba(12, 12, 16, 0.28)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#FAF7F0';
  ctx.beginPath();
  ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? radius : radius * 0.34;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ============================================================================
 * UPLOADED NON-HALLOWEEN SCENIC STRIP BACKGROUNDS & MATCHED PALETTES
 * ========================================================================== */

function drawHelloKittyStripBackground(
  ctx: CanvasRenderingContext2D,
  bgImg: HTMLImageElement | null,
  stripH: number,
  seed: number
): void {
  // Overall palette matched directly to hellokitty_background3_f5805ff2.jpg (736x707):
  // Cheerful Sanrio sky blue (#8DD7FE) flowing seamlessly into lush spring meadow green (#A0D28B)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, stripH);
  baseGrad.addColorStop(0, '#8DD7FE');
  baseGrad.addColorStop(0.78, '#8DD7FE');
  baseGrad.addColorStop(0.88, '#9CD5A8');
  baseGrad.addColorStop(1, '#A0D28B');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, STRIP_W, stripH);

  if (bgImg) {
    const nw = bgImg.naturalWidth || 736;
    const nh = bgImg.naturalHeight || 707;

    // 1. Top sky + cute upper-left white cloud from hellokitty_background3 across strip header
    const topSrcH = Math.round(nh * 0.184); // y = 0..130 (pure sky + cloud above Kuromi's ears)
    const topDstH = Math.round(STRIP_W * (topSrcH / nw)); // ~148px
    ctx.drawImage(bgImg, 0, 0, nw, topSrcH, 0, 0, STRIP_W, topDstH);

    // 2. Bottom Footer Scene: Kuromi, My Melody, Badtz-Maru, Hello Kitty, Pompompurin,
    //    Pochacco, Keroppi, Cinnamoroll & red tulips on the green grassy hill!
    //    Crop y = 112..707 (595px high -> 679px at 840px width). Top of crop is identical #8DD7FE sky!
    const charSrcY = Math.round(nh * 0.158); // ~112px
    const charSrcH = nh - charSrcY; // ~595px
    const charDstH = Math.round(STRIP_W * (charSrcH / nw)); // ~679px
    const charDstY = stripH - charDstH;

    ctx.drawImage(bgImg, 0, charSrcY, nw, charSrcH, 0, charDstY, STRIP_W, charDstH);

    // Feather top of sky slice just in case of JPEG compression variation
    const skyJoin = ctx.createLinearGradient(0, charDstY - 12, 0, charDstY + 34);
    skyJoin.addColorStop(0, '#8DD7FE');
    skyJoin.addColorStop(0.5, 'rgba(141, 215, 254, 0.5)');
    skyJoin.addColorStop(1, 'rgba(141, 215, 254, 0)');
    ctx.fillStyle = skyJoin;
    ctx.fillRect(0, charDstY - 12, STRIP_W, 46);
  }

  drawSubtlePaperGrain(ctx, STRIP_W, stripH, seed, 0.72);

  // Crisp cream-white & Sanrio charcoal outer border trim
  ctx.strokeStyle = 'rgba(255, 253, 248, 0.78)';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, STRIP_W - 28, stripH - 28);
  ctx.strokeStyle = 'rgba(29, 37, 32, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(21, 21, STRIP_W - 42, stripH - 42);
}

function drawCharlieBrownStripBackground(
  ctx: CanvasRenderingContext2D,
  bgImg: HTMLImageElement | null,
  stripH: number,
  seed: number
): void {
  // Overall palette matched directly to charliebrown_background3_1f11595a.png (1152x2048):
  // Active artwork is strictly y = 272..1732 (excluding outer #808080 letterbox bars):
  // Classic Peanuts blue sky (#7AB8ED -> #8EC4EE), sunny grass (#92AD32), and sandy path (#D6BA8D)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, stripH);
  baseGrad.addColorStop(0, '#7AB8ED');
  baseGrad.addColorStop(0.68, '#87BFEE');
  baseGrad.addColorStop(0.84, '#92C7EE');
  baseGrad.addColorStop(1, '#D6BA8D');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, STRIP_W, stripH);

  if (bgImg) {
    const nw = bgImg.naturalWidth || 1152;
    const nh = bgImg.naturalHeight || 2048;

    // Active non-letterboxed artwork bounds inside 1152x2048
    const artTopY = Math.round(nh * 0.133); // 272px
    const artBotY = Math.round(nh * 0.8455); // 1732px
    const artH = Math.max(100, artBotY - artTopY); // 1460px

    // 1. Top sky texture across header from pure upper sky strip (y = 273..312)
    const skyBandH = Math.round(nh * 0.019);
    ctx.drawImage(bgImg, 0, artTopY + 1, nw, skyBandH, 0, 0, STRIP_W, HEADER_H + 40);

    // 2. Full-width aspect-preserved Charlie Brown + colorful balloons + grass + picket fence + sandy path
    //    anchored flush at stripH! Charlie Brown stands completely below Frame 4 while balloons peek out above!
    const sceneDstH = Math.round(STRIP_W * (artH / nw)); // ~1065px
    const sceneDstY = stripH - sceneDstH; // ~2925px

    ctx.drawImage(bgImg, 0, artTopY, nw, artH, 0, sceneDstY, STRIP_W, sceneDstH);

    // Seamless sky join at sceneDstY
    const skyJoin = ctx.createLinearGradient(0, sceneDstY - 18, 0, sceneDstY + 42);
    skyJoin.addColorStop(0, '#86BFEE');
    skyJoin.addColorStop(0.45, 'rgba(122, 184, 237, 0.55)');
    skyJoin.addColorStop(1, 'rgba(122, 184, 237, 0)');
    ctx.fillStyle = skyJoin;
    ctx.fillRect(0, sceneDstY - 18, STRIP_W, 60);
  }

  drawSubtlePaperGrain(ctx, STRIP_W, stripH, seed, 0.78);

  // Classic Peanuts ink & warm sunlit cream outer trim
  ctx.strokeStyle = 'rgba(31, 27, 24, 0.52)';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(14, 14, STRIP_W - 28, stripH - 28);
  ctx.strokeStyle = 'rgba(255, 251, 240, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(21, 21, STRIP_W - 42, stripH - 42);
}

function drawClassicNoirStripBackground(
  ctx: CanvasRenderingContext2D,
  stripH: number,
  seed: number
): void {
  ctx.fillStyle = '#F6F4EE';
  ctx.fillRect(0, 0, STRIP_W, stripH);
  drawSubtlePaperGrain(ctx, STRIP_W, stripH, seed, 0.75);

  ctx.strokeStyle = '#141316';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(18, 18, STRIP_W - 36, stripH - 36);

  ctx.strokeStyle = 'rgba(20, 19, 22, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(26, 26, STRIP_W - 52, stripH - 52);
}

/* ============================================================================
 * RANDOMIZED DIE-CUT STICKER OVERLAYS ON BORDERS & PHOTOS
 * ========================================================================== */

interface StickerSlot {
  x: number;
  y: number;
  maxDim: number;
  rotation: number;
}

/**
 * Builds randomized, non-uniform sticker placements that guarantee AT LEAST ONE
 * character sticker overlaps every single one of the 4 photos (including Photo 4),
 * plus 1-3 randomized bonus stickers on opposite corners so not all characters crowd on at once.
 */
function buildUploadedStickerSlots(rng: () => number): StickerSlot[] {
  const slots: StickerSlot[] = [];
  const primarySideByFrame: boolean[] = [];
  const primaryUpperByFrame: boolean[] = [];

  let prevLeft = rng() > 0.5;

  // Phase 1: Guaranteed 1 character sticker overlapping EACH of the 4 photos (0, 1, 2, 3)
  for (let i = 0; i < 4; i++) {
    const fy = HEADER_H + i * (FRAME_H + GAP_H);

    // Organic side alternation (mostly alternating left/right, occasionally same-side)
    const placeLeft = i === 0 ? prevLeft : rng() < 0.24 ? prevLeft : !prevLeft;
    prevLeft = placeLeft;
    primarySideByFrame.push(placeLeft);

    // Center X right across the photo's left or right edge so the character clearly overlaps the photo
    const x = placeLeft
      ? randRange(rng, 124, 194)
      : randRange(rng, STRIP_W - 194, STRIP_W - 124);

    // For Photo 4 (i === 3), stay in the upper-to-mid region so we never cover the bottom scenic characters
    const placeUpper = i === 3 ? true : rng() > 0.48;
    primaryUpperByFrame.push(placeUpper);

    const y =
      i === 3
        ? fy + randRange(rng, 120, FRAME_H - 220)
        : placeUpper
          ? fy + randRange(rng, 110, 265)
          : fy + randRange(rng, FRAME_H - 235, FRAME_H - 85);

    slots.push({
      x,
      y,
      maxDim: randRange(rng, 228, 286),
      rotation: placeLeft ? randRange(rng, -0.2, 0.14) : randRange(rng, -0.14, 0.2),
    });
  }

  // Phase 2: Add 1 to 3 randomized bonus character stickers on opposite corners of randomly chosen photos
  const rBonus = rng();
  const bonusCount = rBonus < 0.34 ? 1 : rBonus < 0.76 ? 2 : 3;
  const candidateFrames = shuffleWithRng([0, 1, 2, 3], rng).slice(0, bonusCount);

  for (const frameIdx of candidateFrames) {
    const fy = HEADER_H + frameIdx * (FRAME_H + GAP_H);
    const oppLeft = !primarySideByFrame[frameIdx];
    const oppUpper = !primaryUpperByFrame[frameIdx];

    const x = oppLeft
      ? randRange(rng, 120, 188)
      : randRange(rng, STRIP_W - 188, STRIP_W - 120);

    const y =
      frameIdx === 3
        ? fy + randRange(rng, 95, 245)
        : oppUpper
          ? fy + randRange(rng, 90, 235)
          : fy + randRange(rng, FRAME_H - 220, FRAME_H - 70);

    slots.push({
      x,
      y,
      maxDim: randRange(rng, 212, 266),
      rotation: randRange(rng, -0.22, 0.22),
    });
  }

  return slots;
}

function drawProcessedStickerAt(
  ctx: CanvasRenderingContext2D,
  sticker: ProcessedSticker,
  slot: StickerSlot
): void {
  const aspect = sticker.width / Math.max(1, sticker.height);
  let drawW = slot.maxDim;
  let drawH = slot.maxDim;
  if (aspect >= 1) {
    drawH = slot.maxDim / aspect;
  } else {
    drawW = slot.maxDim * aspect;
  }

  const halfW = drawW * 0.5;
  const clampedX = Math.max(halfW + 6, Math.min(STRIP_W - halfW - 6, slot.x));

  ctx.save();
  ctx.translate(clampedX, slot.y);
  ctx.rotate(slot.rotation);
  ctx.drawImage(sticker.canvas, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
  ctx.restore();
}

function drawClassicNoirOverlays(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = createRng(seed + 777);
  let left = rng() > 0.5;
  for (let i = 0; i < 4; i++) {
    const fy = HEADER_H + i * (FRAME_H + GAP_H);
    left = !left;
    const x = left ? randRange(rng, 94, 150) : randRange(rng, STRIP_W - 150, STRIP_W - 94);
    const y = fy + randRange(rng, 95, FRAME_H - 95);
    const fill = i % 2 === 0 ? '#141316' : '#D4A359';
    drawFourPointStarSticker(
      ctx,
      x,
      y,
      randRange(rng, 21, 27),
      randRange(rng, -0.25, 0.25),
      fill
    );
  }
}

/* ============================================================================
 * BOTTOM DATE + YEAR STAMP
 * ========================================================================== */

function drawFooterDateStamp(
  ctx: CanvasRenderingContext2D,
  themeId: StripThemeId,
  stripH: number,
  stampText: string
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (themeId === 'hello-kitty') {
    const y = stripH - 42;
    ctx.font = '700 26px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255, 253, 248, 0.82)';
    ctx.fillText(stampText, STRIP_W / 2, y + 1.5);
    ctx.fillStyle = '#1B2B1E';
    ctx.fillText(stampText, STRIP_W / 2, y);
  } else if (themeId === 'charlie-brown') {
    const y = stripH - 36;
    ctx.font = '700 26px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255, 250, 238, 0.72)';
    ctx.fillText(stampText, STRIP_W / 2, y + 1.5);
    ctx.fillStyle = '#231C14';
    ctx.fillText(stampText, STRIP_W / 2, y);
  } else {
    const y = FOOTER_Y + CLASSIC_FOOTER_H * 0.52;
    ctx.font = '600 25px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = '#141316';
    ctx.fillText(stampText, STRIP_W / 2, y);
  }

  ctx.restore();
}

export interface RenderStripOptions {
  frames: string[]; // 4 data URLs
  themeId: StripThemeId;
  customNote?: string;
  stickerSeed?: number;
  unexposedBlank?: boolean; // When true, renders darkroom unexposed frames for developing animation
}

/**
 * Renders the full 4-pose high-resolution photobooth strip (with 1.5"x1.8" vertical frames,
 * uploaded scenic Hello Kitty & Charlie Brown bottom backgrounds, and randomized character stickers
 * with at least 1 sticker per picture) to a PNG data URL ready for Apple Photos saving or Web Share.
 */
export async function renderPhotoStrip(options: RenderStripOptions): Promise<string> {
  const {
    frames,
    themeId,
    customNote,
    stickerSeed = 20261103,
    unexposedBlank = false,
  } = options;

  const theme = STRIP_THEMES.find((t) => t.id === themeId) || STRIP_THEMES[0];
  const { width: stripW, height: stripH } = getStripDimensions(themeId);

  const canvas = document.createElement('canvas');
  canvas.width = stripW;
  canvas.height = stripH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Determine randomized sticker slots & select only the subset of characters needed for this strip!
  const rng = createRng(stickerSeed + 909);
  const allDefs = getThemeStickerDefinitions(themeId);
  const slots = allDefs.length > 0 ? buildUploadedStickerSlots(rng) : [];

  const chosenDefs =
    allDefs.length > 0 ? shuffleWithRng(allDefs, rng).slice(0, slots.length) : [];
  while (allDefs.length > 0 && chosenDefs.length < slots.length) {
    chosenDefs.push(...shuffleWithRng(allDefs, rng));
  }

  const [bgImg, chosenStickers, frameImages] = await Promise.all([
    loadThemeBackgroundImage(themeId),
    Promise.all(chosenDefs.slice(0, slots.length).map((def) => getProcessedStickerByDef(def))),
    unexposedBlank
      ? Promise.resolve<HTMLImageElement[]>([])
      : Promise.all(frames.slice(0, 4).map((src) => loadCachedImage(src))),
  ]);

  // 1. Draw Theme Strip Background (including bottom character scene for HK & CB)
  if (themeId === 'hello-kitty') {
    drawHelloKittyStripBackground(ctx, bgImg, stripH, stickerSeed);
  } else if (themeId === 'charlie-brown') {
    drawCharlieBrownStripBackground(ctx, bgImg, stripH, stickerSeed);
  } else {
    drawClassicNoirStripBackground(ctx, stripH, stickerSeed);
  }

  // 2. Draw the 4 Vertical 1.5"x1.8" Film Frames (or dark milky emulsion while developing)
  for (let i = 0; i < 4; i++) {
    const x = BORDER_X;
    const y = HEADER_H + i * (FRAME_H + GAP_H);

    ctx.save();
    ctx.shadowColor = 'rgba(14, 22, 30, 0.28)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#121316';
    ctx.fillRect(x, y, FRAME_W, FRAME_H);
    ctx.restore();

    if (!unexposedBlank && frameImages[i]) {
      const img = frameImages[i];
      const srcAspect = img.width / img.height;
      const dstAspect = FRAME_W / FRAME_H;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;
      if (srcAspect > dstAspect) {
        sw = img.height * dstAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / dstAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, FRAME_W, FRAME_H);
    } else {
      const unexposedGrad = ctx.createLinearGradient(x, y, x + FRAME_W, y + FRAME_H);
      unexposedGrad.addColorStop(0, '#18191e');
      unexposedGrad.addColorStop(0.5, '#22242b');
      unexposedGrad.addColorStop(1, '#14151a');
      ctx.fillStyle = unexposedGrad;
      ctx.fillRect(x, y, FRAME_W, FRAME_H);
    }

    // Crisp palette-coordinated frame trim around each photo
    if (themeId === 'hello-kitty') {
      ctx.strokeStyle = '#FFFDF8';
      ctx.lineWidth = 6;
      ctx.strokeRect(x - 3, y - 3, FRAME_W + 6, FRAME_H + 6);
      ctx.strokeStyle = '#1D2520';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x, y, FRAME_W, FRAME_H);
    } else if (themeId === 'charlie-brown') {
      ctx.strokeStyle = '#FFFDF6';
      ctx.lineWidth = 6;
      ctx.strokeRect(x - 3, y - 3, FRAME_W + 6, FRAME_H + 6);
      ctx.strokeStyle = '#1F1B18';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x, y, FRAME_W, FRAME_H);
    } else {
      ctx.strokeStyle = '#141316';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, FRAME_W, FRAME_H);
    }
  }

  // 3. Draw Randomized Die-Cut Character Stickers OVERLAPPING Borders & Photo Corners!
  if (chosenStickers.length > 0 && slots.length > 0) {
    for (let i = 0; i < slots.length; i++) {
      const sticker = chosenStickers[i % chosenStickers.length];
      if (sticker) {
        drawProcessedStickerAt(ctx, sticker, slots[i]);
      }
    }
  } else {
    drawClassicNoirOverlays(ctx, stickerSeed);
  }

  // 4. Draw Clean Date + Year Stamp at the Bottom of the Strip
  const cleanNote = customNote && customNote.trim().length > 0 ? customNote.trim() : '';
  const stampText = (cleanNote || theme.defaultStamp || formatCurrentStripDate()).toUpperCase();
  drawFooterDateStamp(ctx, themeId, stripH, stampText);

  return canvas.toDataURL('image/png');
}
