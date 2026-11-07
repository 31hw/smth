import React from 'react';
import { isCreateRoute } from '../routeMeta';
import { navigateInternal } from './next-router';

function formatHref(href) {
  if (typeof href === 'string') return href;
  if (href && typeof href === 'object') {
    const p = href.pathname || '/';
    const q = href.query ? new URLSearchParams(href.query).toString() : '';
    return p + (q ? '?' + q : '');
  }
  return '/';
}

function isChromeMode() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement &&
    document.documentElement.dataset.rbxClassicChrome === '1'
  );
}

function isCreateHost() {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname || '').toLowerCase() === 'create.roblox.com'
  );
}

export default function NextLink({ href, as, replace, children, className, style, ...rest }) {
  const resolved = formatHref(as || href);

  let finalHref = resolved;
  if (isCreateRoute(resolved)) {
    finalHref = /^https?:\/\/create\.roblox\.com/i.test(resolved)
      ? resolved
      : 'https://create.roblox.com/';
  } else if (isCreateHost() && finalHref.startsWith('/')) {
    // The chrome is hosted on create.roblox.com, but its links point at the
    // classic www.roblox.com pages.
    finalHref = 'https://www.roblox.com' + finalHref;
  }

  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (isCreateRoute(resolved)) {
      if (isCreateHost()) return;
      e.preventDefault();
      navigateInternal(resolved, Boolean(replace));
      return;
    }
    // Let the browser do a real navigation while the classic chrome is shown;
    // the chrome has no client-side page renderer.
    if (isChromeMode()) return;
    if (/^https?:\/\//i.test(finalHref)) {
      try {
        const u = new URL(finalHref);
        if (u.origin !== window.location.origin) return;
      } catch (_) {
        return;
      }
    }
    e.preventDefault();
    navigateInternal(finalHref, Boolean(replace));
  };

  if (React.isValidElement(children) && children.type === 'a') {
    return React.cloneElement(children, {
      href: children.props.href || finalHref,
      onClick: (e) => {
        if (typeof children.props.onClick === 'function') {
          children.props.onClick(e);
        }
        onClick(e);
      },
    });
  }

  return (
    <a href={finalHref} className={className} style={style} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
