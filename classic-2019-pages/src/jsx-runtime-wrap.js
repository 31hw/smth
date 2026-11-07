import React from 'react';
import { getAssetUrl, rewriteCssAssetUrls } from './lib/assetUrl';

function normalizeProps(type, props) {
  if (!props || typeof props !== 'object') return props;
  let mutated = null;

  if (type === 'img' && typeof props.src === 'string' && props.src.startsWith('/')) {
    const nextSrc = getAssetUrl(props.src);
    if (nextSrc !== props.src) {
      mutated = { ...props, src: nextSrc };
    }
  }

  if (props.style && typeof props.style === 'object') {
    let styleMutated = null;
    for (const k of ['backgroundImage', 'background']) {
      const val = props.style[k];
      if (typeof val === 'string' && val.includes('/img/')) {
        const nextVal = rewriteCssAssetUrls(val);
        if (nextVal !== val) {
          if (!styleMutated) styleMutated = { ...props.style };
          styleMutated[k] = nextVal;
        }
      }
    }
    if (styleMutated) {
      mutated = { ...(mutated || props), style: styleMutated };
    }
  }

  return mutated || props;
}

export const Fragment = React.Fragment;

export function jsx(type, props, key) {
  const finalProps = normalizeProps(type, props);
  if (typeof key !== 'undefined') {
    return React.createElement(type, { ...finalProps, key });
  }
  return React.createElement(type, finalProps);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
