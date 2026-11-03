export enum BoothStage {
  Lobby = 'LOBBY',
  Booth = 'BOOTH',
  Developing = 'DEVELOPING',
  Result = 'RESULT',
}

export type StripThemeId = 'hello-kitty' | 'charlie-brown' | 'classic-noir';

export type FilmMode = 'bw' | 'color';

export type FlashMode = 'auto' | 'on' | 'off';

export type MirrorMode = 'smoked-mirror' | 'blind-curtain';

export interface StickerCropDef {
  id: string;
  sheetUrl: string;
  crop: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  bgRef: [number, number, number];
  label: string;
}

export interface StripThemeMeta {
  id: StripThemeId;
  name: string;
  subtitle: string;
  description: string;
  paperHex: string;
  accentHex: string;
  inkHex: string;
  bgImageUrl?: string;
  bgPreviewScaleClass?: string;
  defaultStamp: string;
}

export interface SavedStrip {
  id: string;
  createdAt: string;
  themeId: StripThemeId;
  filmMode?: FilmMode;
  customNote: string;
  stickerSeed: number;
  rawFrames?: string[]; // 4 clean cropped source frames so user can switch B&W <-> Color anytime
  frames: string[]; // 4 processed grainy B&W or Color film data URLs
  stripDataUrl: string; // Full rendered high-res strip PNG data URL
}

export function formatCurrentStripDate(): string {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function pickRandomOpeningTheme(): StripThemeId {
  return Math.random() < 0.5 ? 'hello-kitty' : 'charlie-brown';
}

const DEFAULT_DATE_STAMP = formatCurrentStripDate();

export const HELLO_KITTY_BG_URL = '/assets/aistudio/hellokitty_background3_f5805ff2.jpg';
export const CHARLIE_BROWN_BG_URL = '/assets/aistudio/charliebrown_background3_1f11595a.png';

export const HELLO_KITTY_CHARACTERS_SHEET_1 =
  '/assets/aistudio/hellokitty_characters_d1081b4f.png';
export const HELLO_KITTY_CHARACTERS_SHEET_2 =
  '/assets/aistudio/hellokitty_characters2_48c3fbbe.png';
export const CHARLIE_BROWN_CHARACTERS_SHEET =
  '/assets/aistudio/charliebrown_characters_36df640f.png';

export const HELLO_KITTY_STICKER_DEFS: StickerCropDef[] = [
  // Sheet 1: Sanrio Friends (10 individual characters)
  {
    id: 'hk-pompompurin',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 14, y: 48, w: 434, h: 422 },
    bgRef: [255, 255, 255],
    label: 'Pompompurin',
  },
  {
    id: 'hk-keroppi',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 446, y: 284, w: 286, h: 342 },
    bgRef: [255, 255, 255],
    label: 'Keroppi',
  },
  {
    id: 'hk-mymelody',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 52, y: 516, w: 340, h: 506 },
    bgRef: [255, 255, 255],
    label: 'My Melody',
  },
  {
    id: 'hk-kitty-pink',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 736, y: 560, w: 366, h: 438 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty',
  },
  {
    id: 'hk-piano',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 388, y: 736, w: 388, h: 500 },
    bgRef: [255, 255, 255],
    label: 'My Sweet Piano',
  },
  {
    id: 'hk-chococat',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 32, y: 1068, w: 402, h: 402 },
    bgRef: [255, 255, 255],
    label: 'Chococat',
  },
  {
    id: 'hk-badtzmaru',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 442, y: 1264, w: 328, h: 408 },
    bgRef: [255, 255, 255],
    label: 'Badtz-Maru',
  },
  {
    id: 'hk-tuxedosam',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 768, y: 1024, w: 378, h: 452 },
    bgRef: [255, 255, 255],
    label: 'Tuxedosam',
  },
  {
    id: 'hk-kuromi',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 56, y: 1544, w: 386, h: 464 },
    bgRef: [255, 255, 255],
    label: 'Kuromi',
  },
  {
    id: 'hk-cinnamoroll',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_1,
    crop: { x: 460, y: 1692, w: 628, h: 340 },
    bgRef: [255, 255, 255],
    label: 'Cinnamoroll',
  },

  // Sheet 2: Classic Hello Kitty Poses (12 individual characters)
  {
    id: 'hk2-strawberry',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 108, y: 256, w: 284, h: 332 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Strawberry',
  },
  {
    id: 'hk2-overalls-wave',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 420, y: 248, w: 284, h: 324 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Overalls',
  },
  {
    id: 'hk2-pink-flower',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 736, y: 232, w: 284, h: 332 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Blossom',
  },
  {
    id: 'hk2-teddy',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 96, y: 648, w: 316, h: 372 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty & Tiny Chum',
  },
  {
    id: 'hk2-berry-hood',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 428, y: 652, w: 288, h: 364 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Berry Hood',
  },
  {
    id: 'hk2-overalls-stand',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 748, y: 652, w: 272, h: 352 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Classic',
  },
  {
    id: 'hk2-painter',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 112, y: 1076, w: 348, h: 384 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Artist',
  },
  {
    id: 'hk2-side-pose',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 428, y: 1036, w: 308, h: 392 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Side Pose',
  },
  {
    id: 'hk2-camera',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 732, y: 1024, w: 312, h: 388 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Photographer',
  },
  {
    id: 'hk2-flower-gift',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 116, y: 1528, w: 296, h: 360 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Daisy',
  },
  {
    id: 'hk2-sunhat',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 432, y: 1520, w: 332, h: 352 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Sunhat',
  },
  {
    id: 'hk2-chef',
    sheetUrl: HELLO_KITTY_CHARACTERS_SHEET_2,
    crop: { x: 764, y: 1480, w: 284, h: 392 },
    bgRef: [255, 255, 255],
    label: 'Hello Kitty Baker',
  },
];

export const CHARLIE_BROWN_STICKER_DEFS: StickerCropDef[] = [
  {
    id: 'cb-woodstock',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 96, y: 116, w: 292, h: 372 },
    bgRef: [231, 231, 231],
    label: 'Woodstock',
  },
  {
    id: 'cb-snoopy-hug',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 440, y: 88, w: 268, h: 404 },
    bgRef: [231, 231, 231],
    label: 'Snoopy & Woodstock',
  },
  {
    id: 'cb-snoopy-doghouse-top',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 788, y: 44, w: 288, h: 452 },
    bgRef: [231, 231, 231],
    label: 'Snoopy on Doghouse',
  },
  {
    id: 'cb-peppermint-patty',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 88, y: 568, w: 268, h: 444 },
    bgRef: [231, 231, 231],
    label: 'Peppermint Patty',
  },
  {
    id: 'cb-charlie-brown',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 484, y: 556, w: 232, h: 460 },
    bgRef: [231, 231, 231],
    label: 'Charlie Brown',
  },
  {
    id: 'cb-linus',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 792, y: 576, w: 320, h: 452 },
    bgRef: [231, 231, 231],
    label: 'Linus',
  },
  {
    id: 'cb-doghouse',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 44, y: 1084, w: 364, h: 408 },
    bgRef: [231, 231, 231],
    label: 'Snoopy Doghouse',
  },
  {
    id: 'cb-sally',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 476, y: 1064, w: 248, h: 460 },
    bgRef: [231, 231, 231],
    label: 'Sally Brown',
  },
  {
    id: 'cb-pigpen',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 800, y: 1048, w: 264, h: 488 },
    bgRef: [231, 231, 231],
    label: 'Pig-Pen',
  },
  {
    id: 'cb-lucy',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 100, y: 1576, w: 248, h: 456 },
    bgRef: [231, 231, 231],
    label: 'Lucy van Pelt',
  },
  {
    id: 'cb-heather',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 444, y: 1564, w: 276, h: 456 },
    bgRef: [231, 231, 231],
    label: 'Little Red-Haired Girl',
  },
  {
    id: 'cb-marcie',
    sheetUrl: CHARLIE_BROWN_CHARACTERS_SHEET,
    crop: { x: 804, y: 1560, w: 236, h: 480 },
    bgRef: [231, 231, 231],
    label: 'Marcie',
  },
];

export const STRIP_THEMES: StripThemeMeta[] = [
  {
    id: 'hello-kitty',
    name: 'Hello Kitty',
    subtitle: 'Sanrio Meadow & Character Stickers',
    description:
      'Sunny sky-blue & meadow-green strip with Hello Kitty and Sanrio friends on the bottom plus randomized character stickers.',
    paperHex: '#8DD7FE',
    accentHex: '#F47296',
    inkHex: '#1D2520',
    bgImageUrl: HELLO_KITTY_BG_URL,
    bgPreviewScaleClass: 'scale-105',
    defaultStamp: DEFAULT_DATE_STAMP,
  },
  {
    id: 'charlie-brown',
    name: 'Charlie Brown',
    subtitle: 'Peanuts Sky & Character Stickers',
    description:
      'Classic Peanuts blue-sky & sunny grass strip with Charlie Brown holding balloons on the bottom plus randomized Peanuts stickers.',
    paperHex: '#79B8ED',
    accentHex: '#F2B84B',
    inkHex: '#1F1B18',
    bgImageUrl: CHARLIE_BROWN_BG_URL,
    bgPreviewScaleClass: 'scale-[1.45]',
    defaultStamp: DEFAULT_DATE_STAMP,
  },
  {
    id: 'classic-noir',
    name: 'Midnight Booth',
    subtitle: 'Classic Silver Halide Film Strip',
    description:
      'Minimalist archival darkroom baryta paper accented with subtle studio star marks and dated stamp.',
    paperHex: '#F6F4EE',
    accentHex: '#E5B45B',
    inkHex: '#141316',
    defaultStamp: DEFAULT_DATE_STAMP,
  },
];
