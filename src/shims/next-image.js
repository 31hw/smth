import React from 'react';
import { getAssetUrl } from '../lib/assetUrl';

export default function Image({ src, alt = '', width, height, className, style, ...rest }) {
  const resolved = typeof src === 'string' ? getAssetUrl(src) : src;
  return (
    <img
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      {...rest}
    />
  );
}
