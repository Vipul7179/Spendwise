const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const dialogs: HTMLElement[] = [];
const originalInert = new Map<HTMLElement, boolean>();
let originalOverflow = '';

function updateBackground() {
  for (const [element, inert] of originalInert) element.inert = inert;
  originalInert.clear();
  let branch = dialogs[dialogs.length - 1];
  if (!branch) { document.body.style.overflow = originalOverflow; return; }
  document.body.style.overflow = 'hidden';
  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling !== branch && sibling instanceof HTMLElement) {
        originalInert.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
    if (branch.parentElement === document.body) break;
    branch = branch.parentElement;
  }
}

// Preserve the existing dialog markup/styles, including nested guest dialogs.
export function manageDialogFocus(dialog: HTMLElement, close: () => void) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (!dialogs.length) originalOverflow = document.body.style.overflow;
  dialogs.push(dialog);
  updateBackground();
  const candidates = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => !element.closest('[inert]') && element.getClientRects().length > 0);
  const focusFirst = () => (candidates()[0] || dialog).focus();
  focusFirst();
  const isTop = () => dialogs[dialogs.length - 1] === dialog;
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isTop()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    } else if (event.key === 'Tab') {
      const items = candidates();
      const first = items[0], last = items[items.length - 1];
      if (!first || !dialog.contains(document.activeElement) ||
        (event.shiftKey ? document.activeElement === first || document.activeElement === dialog : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last || dialog : first || dialog).focus();
      }
    }
  };
  const onFocus = () => { if (isTop() && !dialog.contains(document.activeElement)) focusFirst(); };
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focusin', onFocus);
  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('focusin', onFocus);
    const wasTop = isTop();
    const index = dialogs.lastIndexOf(dialog);
    if (index !== -1) dialogs.splice(index, 1);
    updateBackground();
    if (wasTop && previous?.isConnected && !previous.closest('[inert]')) previous.focus();
  };
}
