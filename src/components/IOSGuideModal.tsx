import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  PlusSquare,
  QrCode,
  Send,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type BetaModalTab = 'install' | 'share';

interface IOSGuideModalProps {
  open: boolean;
  initialTab?: BetaModalTab;
  onClose: () => void;
}

export const IOSGuideModal: React.FC<IOSGuideModalProps> = ({
  open,
  initialTab = 'install',
  onClose,
}) => {
  const {
    canNativePrompt,
    isInstalled,
    isInAppBrowser,
    shareUrl,
    triggerNativeInstall,
  } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<BetaModalTab>(initialTab);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setShareStatus(null);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !shareUrl) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#141316',
        light: '#FAF7F0',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, shareUrl]);

  if (!open) return null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      setShareStatus('Select and copy the URL shown above.');
    }
  };

  const handleNativeShareLink = async () => {
    if (!shareUrl) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'alcove — Photobooth Beta',
          text: 'Open this in Safari on your iPhone and tap "Add to Home Screen" to install alcove:',
          url: shareUrl,
        });
        setShareStatus('Invite sent!');
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await handleCopyLink();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-modal-title"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#121923] border-t sm:border border-white/14 p-5 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/alcove-touch-180.png"
              alt="alcove App Icon"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover border border-white/15 shrink-0 shadow-md"
            />
            <div className="min-w-0">
              <h2
                id="beta-modal-title"
                className="font-display text-lg sm:text-xl font-medium text-[#f6f4ef] truncate"
              >
                alcove Beta
              </h2>
              <p className="text-xs text-[#b0b8c3] truncate">
                Install on iPhone or send invite link to friends
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/8 flex items-center justify-center text-[#d6dce4] hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0b1017] border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'install'
                ? 'bg-[#1c2635] text-[#f6f4ef]'
                : 'text-[#9ea7b3] hover:text-[#f6f4ef]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#f2b84b]" />
            Install on iPhone
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'share'
                ? 'bg-[#1c2635] text-[#f6f4ef]'
                : 'text-[#9ea7b3] hover:text-[#f6f4ef]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#f2b84b]" />
            Share Link &amp; QR
          </button>
        </div>

        {activeTab === 'install' ? (
          <div className="space-y-4">
            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-[#182230] border border-[#f2b84b]/40 flex items-start gap-3">
                <Check className="w-5 h-5 text-[#f2b84b] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#f6f4ef]">
                    Installed on Your Home Screen
                  </p>
                  <p className="text-xs text-[#bcc3ce] mt-1 leading-relaxed">
                    alcove is running as a full-screen standalone app. Switch to the “Share Link &amp; QR” tab above to let friends install it on their phones too.
                  </p>
                </div>
              </div>
            ) : canNativePrompt ? (
              <div className="p-4 rounded-2xl bg-[#182230] border border-white/12 space-y-3">
                <p className="text-xs text-[#d6dce4] leading-relaxed">
                  Your browser supports direct 1-tap Home Screen app installation:
                </p>
                <button
                  type="button"
                  onClick={triggerNativeInstall}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#f2b84b] text-[#0e131a] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#f7c463] transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Install alcove Now
                </button>
              </div>
            ) : null}

            {isInAppBrowser && (
              <div className="p-3.5 rounded-xl bg-[#221f18] border border-[#f2b84b]/50 text-xs text-[#f6f4ef] leading-relaxed">
                <strong>Important:</strong> You opened this link inside an in-app preview. Tap the{' '}
                <strong>Safari compass</strong> or <strong>···</strong> menu in the corner and choose{' '}
                <strong>Open in Safari</strong> first so iOS shows “Add to Home Screen”.
              </div>
            )}

            {/* Step-by-Step iOS Safari Home Screen Install Steps */}
            <div className="rounded-2xl bg-[#0d131c] border border-white/10 p-4 space-y-3.5">
              <p className="text-xs font-semibold text-[#dce2ea]">
                How to Install on iPhone (No App Store Needed)
              </p>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#192331] flex items-center justify-center text-xs font-mono-tabular font-semibold text-[#f2b84b] shrink-0">
                  01
                </div>
                <div className="text-xs text-[#bcc3ce] leading-relaxed">
                  Open the shared link on your iPhone in <strong>Apple Safari</strong> (or scan the QR code in the next tab with your iPhone Camera).
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#192331] flex items-center justify-center text-[#f2b84b] shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div className="text-xs text-[#bcc3ce] leading-relaxed">
                  Tap the <strong>Share</strong> icon at the bottom center of Safari’s toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#192331] flex items-center justify-center text-[#f2b84b] shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs text-[#bcc3ce] leading-relaxed">
                  Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>. The{' '}
                  <strong>alcove</strong> app icon appears right on your iPhone alongside your native apps!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('share')}
              className="w-full min-h-[48px] rounded-xl bg-white/10 hover:bg-white/16 text-xs font-semibold text-[#f6f4ef] flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-[#f2b84b]" />
              Get QR Code &amp; Shareable Link for Your Phone
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code Card for Instant iPhone Camera Scan */}
            <div className="rounded-2xl bg-[#0d131c] border border-white/10 p-5 flex flex-col items-center text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan with iPhone Camera to open alcove"
                  referrerPolicy="no-referrer"
                  className="w-44 h-44 rounded-xl shadow-lg border border-white/10"
                />
              ) : (
                <div className="w-44 h-44 rounded-xl bg-white/5 flex items-center justify-center text-xs text-[#8f98a4]">
                  Generating QR...
                </div>
              )}
              <p className="text-xs font-medium text-[#f6f4ef] mt-3.5">
                Point your iPhone Camera here to open on iOS
              </p>
              <p className="text-[11px] text-[#9ea7b3] mt-1 max-w-xs leading-relaxed">
                Make sure your app is set to Public / Shared in AI Studio (or deployed) so friends’ phones can access this link.
              </p>
            </div>

            {/* Copyable URL + Share Buttons */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0b1017] border border-white/10">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  aria-label="Shareable app download link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-transparent px-2 text-xs font-mono-tabular text-[#d6dce4] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/16 text-xs font-semibold text-[#f6f4ef] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#f2b84b]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleNativeShareLink}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#f2b84b] hover:bg-[#f7c463] text-[#0e131a] font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                Send Download Link to Friends
              </button>

              {shareStatus && (
                <p className="text-xs text-center text-[#f2b84b]">{shareStatus}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
