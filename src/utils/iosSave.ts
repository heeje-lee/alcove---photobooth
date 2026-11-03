export interface IOSSaveResult {
  method: 'ios-share-sheet' | 'download' | 'press-and-hold-prompt' | 'cancelled';
  message: string;
}

export function detectAppleIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIPhoneIPad = /iPhone|iPad|iPod/i.test(ua);
  // iPadOS 13+ reports MacIntel with touch points
  const isIPadOS =
    navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  return isIPhoneIPad || isIPadOS;
}

export function detectStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(parts[1] || '');
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Saves the rendered strip PNG onto the user's device, prioritizing native Apple iOS
 * "Save Image" to Apple Photos via Web Share API Level 2 (File share), with graceful
 * fallback to iOS Long-Press ("Save to Photos") or browser PNG download.
 */
export async function saveStripToPhotos(
  stripDataUrl: string,
  themeSlug: string
): Promise<IOSSaveResult> {
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `alcove-${themeSlug}-${timestamp}.png`;
  const blob = dataUrlToBlob(stripDataUrl);
  const file = new File([blob], fileName, { type: 'image/png' });
  const isIOS = detectAppleIOS();

  // 1. Native iOS / Mobile Share Sheet with File -> user taps "Save Image" to save directly into Apple Photos
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'alcove — Photobooth Strip',
        });
        return {
          method: 'ios-share-sheet',
          message: 'Opened Share Sheet — tap "Save Image" to save directly to Apple Photos.',
        };
      }
    } catch (err) {
      const errorName = err instanceof Error ? err.name : '';
      if (errorName === 'AbortError') {
        return {
          method: 'cancelled',
          message: 'Share sheet closed.',
        };
      }
      // If blocked by iframe permissions on iOS, guide user to native iOS Touch & Hold -> Save to Photos
      if (isIOS) {
        return {
          method: 'press-and-hold-prompt',
          message: 'Touch and hold the strip image below, then tap "Save to Photos".',
        };
      }
    }
  }

  // 2. If on iOS Safari where navigator.canShare({files}) was unavailable, prompt native Touch & Hold
  if (isIOS) {
    return {
      method: 'press-and-hold-prompt',
      message: 'Touch and hold the strip image, then tap "Save to Photos" to add to your Camera Roll.',
    };
  }

  // 3. Desktop / Standard Browser clean PNG download
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

  return {
    method: 'download',
    message: 'High-resolution PNG strip saved to your device.',
  };
}
