/**
 * Universal clipboard copy function that works across different browsers and contexts
 * Uses only the fallback method (document.execCommand) to avoid Clipboard API permission errors
 */
export function copyToClipboard(text: string): boolean {
  // Use fallback method with textarea - works in all contexts
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text:', err);
    document.body.removeChild(textarea);
    return false;
  }
}
