import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CHARLIE_BROWN_STICKER_DEFS,
  HELLO_KITTY_STICKER_DEFS,
  StripThemeId,
} from '../types/booth';
import { getProcessedStickerByDef } from '../utils/stickerAssets';

interface AnimatedThemeCharactersProps {
  themeId: StripThemeId;
  seed?: number;
}

function StudioSparkleSvg() {
  return (
    <svg viewBox="0 0 48 48" className="w-11 h-11 drop-shadow-lg" aria-hidden="true">
      <path
        d="M24 4 L28.5 19.5 L44 24 L28.5 28.5 L24 44 L19.5 28.5 L4 24 L19.5 19.5 Z"
        fill="#FAF7F0"
        stroke="#141316"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const AnimatedThemeCharacters: React.FC<AnimatedThemeCharactersProps> = ({
  themeId,
  seed = 1,
}) => {
  const [topStickerUrl, setTopStickerUrl] = useState<string>('');
  const [bottomStickerUrl, setBottomStickerUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    if (themeId === 'classic-noir') {
      setTopStickerUrl('');
      setBottomStickerUrl('');
      return;
    }

    const defs =
      themeId === 'hello-kitty' ? HELLO_KITTY_STICKER_DEFS : CHARLIE_BROWN_STICKER_DEFS;

    if (defs.length === 0) return;

    const absSeed = Math.abs(seed);
    const topIdx = absSeed % defs.length;
    const bottomIdx = (absSeed + Math.max(1, Math.floor(defs.length / 2))) % defs.length;

    Promise.all([
      getProcessedStickerByDef(defs[topIdx]),
      getProcessedStickerByDef(defs[bottomIdx]),
    ])
      .then(([topProcessed, bottomProcessed]) => {
        if (!cancelled) {
          setTopStickerUrl(topProcessed.dataUrl);
          setBottomStickerUrl(bottomProcessed.dataUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [themeId, seed]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {/* Top-Left Floating Die-Cut Character */}
      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [-8, -2, -8],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -left-7 sm:-left-10 top-5 z-10"
      >
        {themeId === 'classic-noir' ? (
          <StudioSparkleSvg />
        ) : topStickerUrl ? (
          <img
            src={topStickerUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl select-none"
          />
        ) : null}
      </motion.div>

      {/* Bottom-Right Floating Die-Cut Character */}
      <motion.div
        animate={{
          y: [0, 9, 0],
          rotate: [7, 1, 7],
        }}
        transition={{
          duration: 4.1,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.4,
        }}
        className="absolute -right-7 sm:-right-10 bottom-12 z-10"
      >
        {themeId === 'classic-noir' ? (
          <StudioSparkleSvg />
        ) : bottomStickerUrl ? (
          <img
            src={bottomStickerUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl select-none"
          />
        ) : null}
      </motion.div>
    </div>
  );
};
