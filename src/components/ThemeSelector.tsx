import React from 'react';
import { STRIP_THEMES, StripThemeId, StripThemeMeta } from '../types/booth';

interface ThemeSelectorProps {
  selectedTheme: StripThemeId;
  onSelectTheme: (theme: StripThemeId) => void;
  compact?: boolean;
}

function ThemeMiniArtwork({ theme }: { theme: StripThemeMeta }) {
  if (theme.bgImageUrl) {
    return (
      <div
        className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/20 shadow-sm"
        style={{ backgroundColor: theme.paperHex }}
      >
        <img
          src={theme.bgImageUrl}
          alt=""
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover object-center ${
            theme.bgPreviewScaleClass || 'scale-105'
          }`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <svg viewBox="0 0 44 44" className="w-11 h-11 shrink-0" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="40"
        height="40"
        rx="10"
        fill="#F6F4EE"
        stroke="#5C5863"
        strokeWidth="1.5"
      />
      <path
        d="M22 10 L24.8 19.2 L34 22 L24.8 24.8 L22 34 L19.2 24.8 L10 22 L19.2 19.2 Z"
        fill="#141316"
      />
    </svg>
  );
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  selectedTheme,
  onSelectTheme,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Strip border theme">
        {STRIP_THEMES.map((theme) => {
          const active = selectedTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelectTheme(theme.id)}
              className={`min-h-[48px] px-3 py-2 rounded-xl border text-left transition-all duration-150 flex items-center gap-2.5 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b84b] ${
                active
                  ? 'bg-[#192330]/90 border-[#f2b84b] text-[#f6f4ef]'
                  : 'bg-[#111822]/75 border-white/14 text-[#d0d5dc] hover:border-white/28 hover:text-[#f6f4ef]'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/30"
                style={{ backgroundColor: theme.paperHex }}
              />
              <span className="text-xs font-semibold truncate">
                {theme.id === 'hello-kitty'
                  ? 'Hello Kitty'
                  : theme.id === 'charlie-brown'
                    ? 'Charlie Brown'
                    : 'Midnight'}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5" role="radiogroup" aria-label="Choose strip border theme">
      {STRIP_THEMES.map((theme) => {
        const active = selectedTheme === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelectTheme(theme.id)}
            className={`w-full min-h-[68px] p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-3.5 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b84b] active:scale-[0.99] ${
              active
                ? 'bg-[#192330]/90 border-[#f2b84b] shadow-md'
                : 'bg-[#111822]/75 border-white/14 hover:border-white/28'
            }`}
          >
            <ThemeMiniArtwork theme={theme} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#f6f4ef] truncate">
                  {theme.name}
                </span>
                <span className="text-[11px] font-mono-tabular text-[#c6ccd4] shrink-0">
                  {active ? 'Selected' : 'Switch Theme'}
                </span>
              </div>
              <p className="text-xs text-[#b8c0ca] mt-0.5 line-clamp-1">{theme.subtitle}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
