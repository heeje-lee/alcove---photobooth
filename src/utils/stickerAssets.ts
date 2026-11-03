import {
  CHARLIE_BROWN_BG_URL,
  CHARLIE_BROWN_STICKER_DEFS,
  HELLO_KITTY_BG_URL,
  HELLO_KITTY_STICKER_DEFS,
  StickerCropDef,
  StripThemeId,
} from '../types/booth';

export interface ProcessedSticker {
  id: string;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
}

const rawImageCache = new Map<string, Promise<HTMLImageElement>>();
const processedStickerCache = new Map<string, Promise<ProcessedSticker>>();

export function loadCachedImage(url: string): Promise<HTMLImageElement> {
  const existing = rawImageCache.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });

  rawImageCache.set(url, promise);
  return promise;
}

function colorDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Crops a single character off a multi-character sheet (`_characters`),
 * removes the exterior sheet background via edge-connected flood-fill without
 * crossing dark character ink outlines, trims any neighbor edge intrusion,
 * and adds a crisp die-cut white vinyl sticker border + soft drop shadow.
 */
async function buildDieCutStickerFromDef(def: StickerCropDef): Promise<ProcessedSticker> {
  const img = await loadCachedImage(def.sheetUrl);
  const { x: sx, y: sy, w: sw, h: sh } = def.crop;

  const maxWorkDim = 360;
  const scale = Math.min(1, maxWorkDim / Math.max(sw, sh));
  const w = Math.max(32, Math.round(sw * scale));
  const h = Math.max(32, Math.round(sh * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!wCtx) {
    return { id: def.id, canvas: workCanvas, dataUrl: '', width: w, height: h };
  }

  wCtx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const imgData = wCtx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;

  const isBg = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const [refR, refG, refB] = def.bgRef;
  const seeds: Array<[number, number, number]> = [[refR, refG, refB]];

  // Also sample the 4 corners of this crop if they are neutral sheet background
  const cornerCoords: Array<[number, number]> = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ];
  for (const [cx, cy] of cornerCoords) {
    const idx = (cy * w + cx) * 4;
    if (data[idx + 3] >= 150) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (colorDist(r, g, b, refR, refG, refB) <= 28) {
        seeds.push([r, g, b]);
      }
    }
  }

  const matchesSeed = (r: number, g: number, b: number, tol: number): boolean => {
    for (let i = 0; i < seeds.length; i++) {
      const [sr, sg, sb] = seeds[i];
      if (colorDist(r, g, b, sr, sg, sb) <= tol) return true;
    }
    return false;
  };

  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] < 150) {
      isBg[i] = 1;
    }
  }

  const enqueueIfBg = (x: number, y: number, tol: number) => {
    const p = y * w + x;
    if (visited[p]) return;
    const idx = p * 4;
    const a = data[idx + 3];
    if (a < 150 || matchesSeed(data[idx], data[idx + 1], data[idx + 2], tol)) {
      visited[p] = 1;
      isBg[p] = 1;
      queue[qTail++] = p;
    }
  };

  // Tight enough tolerance (32) so Snoopy's pre-existing white doghouse trim (#fff) is preserved against #e7e7e7
  const baseTol = 32;

  for (let x = 0; x < w; x++) {
    enqueueIfBg(x, 0, baseTol);
    enqueueIfBg(x, h - 1, baseTol);
  }
  for (let y = 0; y < h; y++) {
    enqueueIfBg(0, y, baseTol);
    enqueueIfBg(w - 1, y, baseTol);
  }

  const dirs = [-1, 1, -w, w];
  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % w;
    const cy = (curr - cx) / w;
    const cIdx = curr * 4;
    const cr = data[cIdx];
    const cg = data[cIdx + 1];
    const cb = data[cIdx + 2];

    for (let d = 0; d < 4; d++) {
      const off = dirs[d];
      if (off === -1 && cx === 0) continue;
      if (off === 1 && cx === w - 1) continue;
      if (off === -w && cy === 0) continue;
      if (off === w && cy === h - 1) continue;

      const next = curr + off;
      if (visited[next]) continue;

      const nIdx = next * 4;
      const na = data[nIdx + 3];
      const nr = data[nIdx];
      const ng = data[nIdx + 1];
      const nb = data[nIdx + 2];

      const stepDist = colorDist(cr, cg, cb, nr, ng, nb);
      if (
        na < 150 ||
        matchesSeed(nr, ng, nb, baseTol) ||
        (stepDist <= 10 && matchesSeed(nr, ng, nb, 40))
      ) {
        visited[next] = 1;
        isBg[next] = 1;
        queue[qTail++] = next;
      }
    }
  }

  // 1px fringe shave on sheet background anti-aliasing
  const shaveList: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (isBg[p]) continue;
      if (isBg[p - 1] || isBg[p + 1] || isBg[p - w] || isBg[p + w]) {
        const idx = p * 4;
        if (matchesSeed(data[idx], data[idx + 1], data[idx + 2], 44)) {
          shaveList.push(p);
        }
      }
    }
  }
  for (const p of shaveList) {
    isBg[p] = 1;
  }

  // Remove tiny specks (< 24px) AND any disconnected neighbor character fragment touching the outer crop edge
  let totalFgBeforeClean = 0;
  for (let i = 0; i < total; i++) {
    if (!isBg[i]) totalFgBeforeClean++;
  }

  const compVisited = new Uint8Array(total);
  const compBuf = new Int32Array(total);
  for (let i = 0; i < total; i++) {
    if (isBg[i] || compVisited[i]) continue;
    let cHead = 0;
    let cTail = 0;
    let touchesCropEdge = false;
    compVisited[i] = 1;
    compBuf[cTail++] = i;

    while (cHead < cTail) {
      const curr = compBuf[cHead++];
      const cx = curr % w;
      const cy = (curr - cx) / w;
      if (cx <= 1 || cx >= w - 2 || cy <= 1 || cy >= h - 2) {
        touchesCropEdge = true;
      }

      if (cx > 0 && !isBg[curr - 1] && !compVisited[curr - 1]) {
        compVisited[curr - 1] = 1;
        compBuf[cTail++] = curr - 1;
      }
      if (cx < w - 1 && !isBg[curr + 1] && !compVisited[curr + 1]) {
        compVisited[curr + 1] = 1;
        compBuf[cTail++] = curr + 1;
      }
      if (cy > 0 && !isBg[curr - w] && !compVisited[curr - w]) {
        compVisited[curr - w] = 1;
        compBuf[cTail++] = curr - w;
      }
      if (cy < h - 1 && !isBg[curr + w] && !compVisited[curr + w]) {
        compVisited[curr + w] = 1;
        compBuf[cTail++] = curr + w;
      }
    }

    const isForeignEdgeFragment =
      touchesCropEdge && totalFgBeforeClean > 200 && cTail < totalFgBeforeClean * 0.25;

    if (cTail < 24 || isForeignEdgeFragment) {
      for (let k = 0; k < cTail; k++) {
        isBg[compBuf[k]] = 1;
      }
    }
  }

  // Compute tight foreground bounding box
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let fgCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isBg[y * w + x]) {
        fgCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (fgCount < 60) {
    minX = 0;
    minY = 0;
    maxX = w - 1;
    maxY = h - 1;
    isBg.fill(0);
  }

  for (let i = 0; i < total; i++) {
    const p4 = i * 4;
    if (isBg[i]) {
      data[p4] = 0;
      data[p4 + 1] = 0;
      data[p4 + 2] = 0;
      data[p4 + 3] = 0;
    } else {
      data[p4 + 3] = 255;
    }
  }
  wCtx.putImageData(imgData, 0, 0);

  const outlineRadius = 10;
  const pad = outlineRadius + 13;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const outW = cropW + pad * 2;
  const outH = cropH + pad * 2;

  // Build crisp white vinyl silhouette backing via circular dilation
  const backingCanvas = document.createElement('canvas');
  backingCanvas.width = outW;
  backingCanvas.height = outH;
  const bCtx = backingCanvas.getContext('2d');

  if (bCtx) {
    const backingImg = bCtx.createImageData(outW, outH);
    const bData = backingImg.data;

    const offsets: Array<[number, number]> = [];
    for (let dy = -outlineRadius; dy <= outlineRadius; dy++) {
      for (let dx = -outlineRadius; dx <= outlineRadius; dx++) {
        if (dx * dx + dy * dy <= outlineRadius * outlineRadius) {
          offsets.push([dx, dy]);
        }
      }
    }

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (isBg[y * w + x]) continue;
        const ox = x - minX + pad;
        const oy = y - minY + pad;
        const isEdge =
          x === 0 ||
          x === w - 1 ||
          y === 0 ||
          y === h - 1 ||
          isBg[y * w + (x - 1)] ||
          isBg[y * w + (x + 1)] ||
          isBg[(y - 1) * w + x] ||
          isBg[(y + 1) * w + x];

        if (!isEdge) {
          const idx = (oy * outW + ox) * 4;
          bData[idx] = 255;
          bData[idx + 1] = 254;
          bData[idx + 2] = 251;
          bData[idx + 3] = 255;
        } else {
          for (let k = 0; k < offsets.length; k++) {
            const tx = ox + offsets[k][0];
            const ty = oy + offsets[k][1];
            const idx = (ty * outW + tx) * 4;
            bData[idx] = 255;
            bData[idx + 1] = 254;
            bData[idx + 2] = 251;
            bData[idx + 3] = 255;
          }
        }
      }
    }
    bCtx.putImageData(backingImg, 0, 0);
  }

  // Composite drop shadow + white die-cut border + clean character artwork
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = outW;
  finalCanvas.height = outH;
  const fCtx = finalCanvas.getContext('2d');
  if (fCtx) {
    fCtx.save();
    fCtx.shadowColor = 'rgba(12, 18, 28, 0.34)';
    fCtx.shadowBlur = 11;
    fCtx.shadowOffsetX = 0;
    fCtx.shadowOffsetY = 4;
    fCtx.drawImage(backingCanvas, 0, 0);
    fCtx.restore();

    fCtx.drawImage(backingCanvas, 0, 0);
    fCtx.drawImage(workCanvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);
  }

  return {
    id: def.id,
    canvas: finalCanvas,
    dataUrl: finalCanvas.toDataURL('image/png'),
    width: outW,
    height: outH,
  };
}

export function getProcessedStickerByDef(def: StickerCropDef): Promise<ProcessedSticker> {
  const existing = processedStickerCache.get(def.id);
  if (existing) return existing;
  const promise = buildDieCutStickerFromDef(def);
  processedStickerCache.set(def.id, promise);
  return promise;
}

export function getThemeStickerDefinitions(themeId: StripThemeId): StickerCropDef[] {
  if (themeId === 'hello-kitty') return HELLO_KITTY_STICKER_DEFS;
  if (themeId === 'charlie-brown') return CHARLIE_BROWN_STICKER_DEFS;
  return [];
}

export async function loadThemeBackgroundImage(
  themeId: StripThemeId
): Promise<HTMLImageElement | null> {
  if (themeId === 'hello-kitty') {
    return loadCachedImage(HELLO_KITTY_BG_URL).catch(() => null);
  }
  if (themeId === 'charlie-brown') {
    return loadCachedImage(CHARLIE_BROWN_BG_URL).catch(() => null);
  }
  return null;
}
