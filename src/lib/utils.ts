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
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Modern Clipboard API failed, attempting fallback...', err);
  }

  // 2. Fallback: Create a temporary hidden textarea for document.execCommand('copy')
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Ensure the textarea is off-screen but part of the DOM
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy method failed:', err);
    document.body.removeChild(textArea);
    return false;
  }
}
