import { useEffect, useState } from 'react';
import { detectAppleIOS, detectStandaloneMode } from '../utils/iosSave';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Resolves the public shareable link so friends can open and install the app on their phones.
 * Automatically maps private `ais-dev-` preview origins to the public `ais-pre-` shared URL.
 */
export function getShareableBetaUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin.replace(/^https:\/\/ais-dev-/, 'https://ais-pre-');
  return `${origin}/?app=alcove`;
}

export function detectInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Instagram|FBAN|FBAV|Line|TikTok|Snapchat|MicroMessenger/i.test(ua);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);

  useEffect(() => {
    setIsInstalled(detectStandaloneMode());
    setIsIOS(detectAppleIOS());
    setIsInAppBrowser(detectInAppWebView());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerNativeInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    canNativePrompt: !!deferredPrompt,
    isInstalled,
    isIOS,
    isInAppBrowser,
    shareUrl: getShareableBetaUrl(),
    triggerNativeInstall,
  };
}
