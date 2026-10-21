'use client';

import Image, { type ImageProps } from 'next/image';
import { useLayoutEffect, useRef, type CSSProperties, type ImgHTMLAttributes } from 'react';
import { observeImage } from '@/lib/image-loading';

type Props = ImageProps & {
  native?: boolean;
  retry?: boolean;
  frameClassName?: string;
  aspectRatio?: string;
};

export default function SkeletonImage({ native = false, retry = false, frameClassName = '', aspectRatio,
  className = '', style, ...props }: Props) {
  const image = useRef<HTMLImageElement>(null);
  const frame = useRef<HTMLSpanElement>(null);
  const source = typeof props.src === 'string' ? props.src : 'default' in props.src ? props.src.default.src : props.src.src;
  useLayoutEffect(() => {
    if (image.current && frame.current) return observeImage(image.current, frame.current);
  }, [source]);

  const frameStyle: CSSProperties = {
    ...(!native && !className ? { width: props.width, height: props.height } : {}),
    ...(aspectRatio ? { aspectRatio } : {}),
    ...style,
  };
  return <span ref={frame} className={`image-frame ${className} ${frameClassName}`} style={frameStyle}
    data-image-state="loading" data-image-native={String(native)} aria-busy="true">
    {native ? (
      // Retain native loading for external images; don't change their URLs or optimization strategy.
      // eslint-disable-next-line @next/next/no-img-element
      <img {...props as ImgHTMLAttributes<HTMLImageElement>} src={source} alt={props.alt} style={{ objectFit: style?.objectFit }} ref={image} />
    ) : <Image {...props} alt={props.alt} ref={image} />}
    <span className="image-skeleton" aria-hidden="true" />
    <span className="image-fallback">
      <span role="img" aria-label={props.alt ? `${props.alt} unavailable` : 'Image unavailable'}>
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="4" width="26" height="24" rx="5" /><circle cx="11" cy="12" r="2.5" /><path d="m5 25 8-8 5 5 4-5 7 8" />
        </svg>
      </span>
      {retry && <button type="button" onClick={(event) => {
        event.preventDefault();
        image.current?.dispatchEvent(new Event('hisbo:image-retry'));
      }}>Retry image</button>}
    </span>
  </span>;
}
