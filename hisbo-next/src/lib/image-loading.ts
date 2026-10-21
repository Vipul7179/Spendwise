// One lifecycle per image; animation is CSS-only, with no polling or timers.
export function observeImage(image: HTMLImageElement, frame: HTMLElement) {
  let active = true;
  let revision = 0;
  let decoding = '';

  const status = (value: 'loading' | 'ready' | 'error', cached = false) => {
    frame.dataset.imageState = value;
    frame.dataset.imageCached = String(cached);
    frame.setAttribute('aria-busy', String(value === 'loading'));
    if (value === 'error') image.setAttribute('aria-hidden', 'true');
    else image.removeAttribute('aria-hidden');
  };
  const failed = () => {
    revision++;
    decoding = '';
    if (active) status('error');
  };
  const ready = async (cached = false) => {
    const source = image.currentSrc || image.src;
    if (!active || !image.naturalWidth || decoding === source) return;
    decoding = source;
    const attempt = ++revision;
    try {
      if (image.decode) await image.decode();
      if (active && attempt === revision && source === (image.currentSrc || image.src)) {
        status('ready', cached);
      }
    } catch {
      if (active && attempt === revision) failed();
    }
  };
  const loaded = () => { void ready(); };
  const retry = () => {
    revision++;
    decoding = '';
    status('loading');
    // Re-request the same URL only on explicit retry. Keep srcset/sizes intact.
    image.src = image.src;
  };

  status('loading');
  image.addEventListener('load', loaded);
  image.addEventListener('error', failed);
  image.addEventListener('hisbo:image-retry', retry);
  if (image.complete) {
    if (image.naturalWidth) void ready(true);
    else failed();
  }
  return () => {
    active = false;
    revision++;
    image.removeEventListener('load', loaded);
    image.removeEventListener('error', failed);
    image.removeEventListener('hisbo:image-retry', retry);
  };
}
