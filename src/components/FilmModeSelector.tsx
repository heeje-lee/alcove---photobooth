import React from 'react';
import { FilmMode } from '../types/booth';

interface FilmModeSelectorProps {
  filmMode: FilmMode;
  onChangeFilmMode: (mode: FilmMode) => void;
  compact?: boolean;
}

export const FilmModeSelector: React.FC<FilmModeSelectorProps> = ({
  filmMode,
  onChangeFilmMode,
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1218] border border-white/12"
        role="radiogroup"
        aria-label="Film stock color mode"
      >
        <button
          type="button"
          role="radio"
          aria-checked={filmMode === 'bw'}
          onClick={() => onChangeFilmMode('bw')}
          className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            filmMode === 'bw'
              ? 'bg-[#202b38] text-[#f6f4ef]'
              : 'text-[#a3abb6] hover:text-[#f6f4ef]'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#f5f2eb] to-[#3f3c45] border border-white/25 shrink-0"
            aria-hidden="true"
          />
          B&amp;W Film
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={filmMode === 'color'}
          onClick={() => onChangeFilmMode('color')}
          className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            filmMode === 'color'
              ? 'bg-[#202b38] text-[#f6f4ef]'
              : 'text-[#a3abb6] hover:text-[#f6f4ef]'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#fcd36a] via-[#f47296] to-[#68b5f6] border border-white/25 shrink-0"
            aria-hidden="true"
          />
          Color Film
        </button>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-2.5"
      role="radiogroup"
      aria-label="Choose 35mm film stock"
    >
      <button
        type="button"
        role="radio"
        aria-checked={filmMode === 'bw'}
        onClick={() => onChangeFilmMode('bw')}
        className={`min-h-[54px] px-3.5 py-2.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-3 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b84b] active:scale-[0.99] ${
          filmMode === 'bw'
            ? 'bg-[#192330]/90 border-[#f2b84b] shadow-md'
            : 'bg-[#111822]/75 border-white/14 hover:border-white/28'
        }`}
      >
        <span
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f4f1ea] via-[#8c8892] to-[#19171d] border border-white/20 shrink-0 shadow-inner"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-[#f6f4ef] truncate">
            Black &amp; White
          </p>
          <p className="text-[11px] text-[#b8c0ca] truncate">Grainy 35mm Silver</p>
        </div>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={filmMode === 'color'}
        onClick={() => onChangeFilmMode('color')}
        className={`min-h-[54px] px-3.5 py-2.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-3 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b84b] active:scale-[0.99] ${
          filmMode === 'color'
            ? 'bg-[#192330]/90 border-[#f2b84b] shadow-md'
            : 'bg-[#111822]/75 border-white/14 hover:border-white/28'
        }`}
      >
        <span
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f9cf63] via-[#f07d92] to-[#5ea8e8] border border-white/20 shrink-0 shadow-inner"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-[#f6f4ef] truncate">
            Warm Color Film
          </p>
          <p className="text-[11px] text-[#b8c0ca] truncate">Grainy 35mm Kodak</p>
        </div>
      </button>
    </div>
  );
};
