import React, { useEffect, useState } from 'react';
import Router from './next-router';

export default function NextNProgress({ color = '#00a2ff', height = 3 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer = null;
    const onStart = () => {
      clearTimeout(timer);
      setVisible(true);
    };
    const onDone = () => {
      timer = setTimeout(() => setVisible(false), 180);
    };
    Router.events.on('routeChangeStart', onStart);
    Router.events.on('routeChangeComplete', onDone);
    Router.events.on('routeChangeError', onDone);
    return () => {
      clearTimeout(timer);
      Router.events.off('routeChangeStart', onStart);
      Router.events.off('routeChangeComplete', onDone);
      Router.events.off('routeChangeError', onDone);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: `${height}px`,
        background: color,
        zIndex: 99999,
        transition: 'opacity 150ms ease',
      }}
    />
  );
}
