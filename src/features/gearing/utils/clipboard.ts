/** Clipboard access with a WebView-compatible fallback and focus restoration. */
export async function copyGearingText(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* Fall back for WebViews that restrict the asynchronous API. */
    }
  }
  const focused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy"))
      throw new Error("Clipboard access is unavailable.");
  } finally {
    textarea.remove();
    focused?.focus({ preventScroll: true });
  }
}
