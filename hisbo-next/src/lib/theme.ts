// Keep the app snapshot authoritative, including its existing automatic mode.
// Self-contained so the same function can run in <head> before first paint.
export function restoreTheme() {
  let preference: string | undefined;
  try {
    const raw = localStorage.getItem('spendwise_v1');
    const saved = raw ? JSON.parse(raw)?.theme : undefined;
    if (saved === 'auto' || saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* Corrupt or unavailable storage must not block rendering. */ }
  if (!preference) {
    try {
      const saved = localStorage.getItem('sw_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'auto') preference = saved;
    } catch { /* Use the system preference through CSS. */ }
  }
  if (preference === 'light' || preference === 'dark') {
    document.documentElement.setAttribute('data-theme', preference);
  } else if (preference === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    // First-time visitor with no saved preference defaults to Light Mode
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export const THEME_INIT_SCRIPT = `(${restoreTheme.toString()})();`;
