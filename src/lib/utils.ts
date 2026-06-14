import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robust copy to clipboard utility.
 * Uses a hidden textarea fallback for environments where navigator.clipboard is blocked (like iframes).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Try the modern Clipboard API
  // Use a more cautious approach to avoid triggering permission errors in restricted contexts
  if (navigator && 'clipboard' in navigator && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // If NotAllowedError occurs, the permission policy is blocking it.
      // We gracefully catch it and proceed to the fallback.
      console.warn('Modern Clipboard API failed, attempting fallback...', err);
    }
  }

  // 2. Fallback: Create a temporary hidden textarea for document.execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure the textarea is off-screen but part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    textArea.style.opacity = "0";
    textArea.setAttribute('readonly', ''); // Prevent keyboard popping on some devices
    
    document.body.appendChild(textArea);
    
    // Select the text
    textArea.focus();
    textArea.select();
    
    // Additional selection logic for iOS
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!successful;
  } catch (err) {
    console.error('Fallback copy method failed:', err);
    return false;
  }
}
