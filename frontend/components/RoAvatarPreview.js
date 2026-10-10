import { useEffect, useMemo, useRef, useState } from 'react';

let rendererSetup;

function makeOutfitModel(renderer, avatar) {
  const assets = (avatar?.assets || []).map((asset) => {
    const id = Number(asset.id ?? asset.assetId);
    const typeId = Number(asset.assetType?.id ?? asset.assetTypeId ?? asset.assetType ?? 0);
    const typeName = asset.assetType?.name || asset.assetTypeName;
    return {
      id,
      name: asset.name || `Asset ${id}`,
      assetType: {
        id: typeId,
        ...(typeName ? { name: typeName } : {}),
      },
      ...(asset.meta ? { meta: asset.meta } : {}),
    };
  }).filter((asset) => Number.isSafeInteger(asset.id) && asset.id > 0);

  return new renderer.OutfitModel().fromJson({
    avatarModel: {
      name: 'Local Avatar',
      playerAvatarType: avatar?.playerAvatarType === 'R6' ? 'R6' : 'R15',
      scales: avatar?.scales || {},
      bodyColors: avatar?.bodyColors || {},
      assets,
    },
    avatarConfigurations: null,
  });
}

async function setupRenderer(RBXRenderer) {
  if (!rendererSetup) {
    rendererSetup = RBXRenderer.fullSetup(true, true, true).then((success) => {
      if (!success) throw new Error('RoAvatar could not initialize WebGL.');
      return true;
    }).catch((error) => {
      rendererSetup = null;
      throw error;
    });
  }
  return rendererSetup;
}

export default function RoAvatarPreview({ userId, avatar, active = true, onSnapshot }) {
  const mountRef = useRef(null);
  const rendererModuleRef = useRef(null);
  const outfitRendererRef = useRef(null);
  const lastAvatarKeyRef = useRef('');
  const [rendererReady, setRendererReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [snapshot, setSnapshot] = useState('');
  const [error, setError] = useState('');
  const avatarKey = useMemo(() => JSON.stringify(avatar || null), [avatar]);
  const avatarIsReady = Boolean(avatar?.bodyColors && avatar?.scales && Array.isArray(avatar?.assets));

  useEffect(() => {
    if (!userId || !avatarIsReady || !mountRef.current) {
      setRendererReady(false);
      setRendered(false);
      return undefined;
    }
    let cancelled = false;
    let module;
    let outfitRenderer;

    const initialize = async () => {
      try {
        setError('');
        setRendererReady(false);
        setRendered(false);
        module = await import('roavatar-renderer');
        if (cancelled) return;
        rendererModuleRef.current = module;

        // RoAvatar's npm package does not include rig/mesh assets. Online assets
        // load the official rig and mesh resources while the outfit itself comes
        // from this instance's local avatar API/state.
        module.FLAGS.ONLINE_ASSETS = true;
        module.FLAGS.USE_WORKERS = false;
        module.FLAGS.INCLUDE_REQUEST_CREDENTIALS_OVERRIDE = 'omit';
        const initialized = await setupRenderer(module.RBXRenderer);
        if (cancelled) return;

        module.RBXRenderer.setBackgroundTransparent(true);
        module.RBXRenderer.setRendererSize(352, 352);
        const rendererElement = module.RBXRenderer.getRendererElement();
        rendererElement.style.width = '352px';
        rendererElement.style.height = '352px';
        rendererElement.style.position = 'absolute';
        rendererElement.style.inset = '0';
        rendererElement.style.overflow = 'hidden';
        if (mountRef.current && !mountRef.current.contains(rendererElement)) {
          mountRef.current.replaceChildren(rendererElement);
        }
        outfitRenderer = new module.OutfitRenderer(
          new module.Authentication(),
          makeOutfitModel(module, avatar),
          module.RBXRenderer.firstScene,
        );
        outfitRendererRef.current = outfitRenderer;
        lastAvatarKeyRef.current = JSON.stringify(avatar || null);
        outfitRenderer.onRenderSuccess.Connect(() => {
          if (cancelled) return;
          setRendered(true);
          setError('');
          requestAnimationFrame(() => {
            if (cancelled) return;
            try {
              const canvas = module.RBXRenderer.getRendererDom();
              if (canvas) {
                const image = canvas.toDataURL('image/png');
                setSnapshot(image);
                onSnapshot?.(image);
              }
            } catch {
              // WebGL snapshots are optional; the live 3D model remains usable.
            }
          });
        });
        outfitRenderer.onError.Connect(() => {
          if (!cancelled) setError('RoAvatar could not load this outfit. Check asset availability and try again.');
        });
        outfitRenderer.onRenderError.Connect(() => {
          if (!cancelled) setError('An avatar mesh or texture could not be rendered.');
        });
        outfitRenderer.startAnimating();
        await outfitRenderer.setMainAnimation('idle');
        if (!cancelled) setRendererReady(initialized);
      } catch (loadError) {
        if (!cancelled) {
          console.error('[RoAvatar] preview initialization failed:', loadError);
          setError(loadError?.message || 'RoAvatar could not start.');
          setRendererReady(false);
        }
      }
    };

    initialize();
    return () => {
      cancelled = true;
      outfitRenderer?.destroy();
      if (outfitRendererRef.current === outfitRenderer) outfitRendererRef.current = null;
      if (rendererModuleRef.current === module) rendererModuleRef.current = null;
      lastAvatarKeyRef.current = '';
      mountRef.current?.replaceChildren();
    };
    // The renderer is initialized once per signed-in user; avatar changes flow
    // through the effect below so dragging a slider does not recreate WebGL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, avatarIsReady]);

  useEffect(() => {
    if (!rendererReady || !rendererModuleRef.current || !outfitRendererRef.current || !avatarIsReady || lastAvatarKeyRef.current === avatarKey) return undefined;
    const timeout = setTimeout(() => {
      try {
        outfitRendererRef.current.setOutfitModel(makeOutfitModel(rendererModuleRef.current, avatar));
        lastAvatarKeyRef.current = avatarKey;
        setRendered(false);
      } catch (updateError) {
        console.error('[RoAvatar] avatar update failed:', updateError);
        setError(updateError?.message || 'The avatar could not be updated.');
      }
    }, 120);
    return () => clearTimeout(timeout);
  }, [avatarKey, avatar, avatarIsReady, rendererReady]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} aria-label="3D avatar preview">
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          top: 0,
          right: '-37.5px',
          width: 352,
          height: 352,
          opacity: active ? 1 : 0,
          pointerEvents: active ? 'auto' : 'none',
        }}
      />
      {!active && (
        <img
          src={snapshot || '/img/placeholder/icon_one.png'}
          alt="2D avatar preview"
          style={{ position: 'absolute', top: 18, right: '-37.5px', width: 352, height: 352, objectFit: 'contain' }}
        />
      )}
      {!avatarIsReady && <span className="spinner" style={{ height: '100%', backgroundSize: 'auto 36px' }} />}
      {avatarIsReady && !rendered && !error && active && (
        <span className="spinner" style={{ height: '100%', backgroundSize: 'auto 36px' }} />
      )}
      {error && active && (
        <div style={{ position: 'absolute', inset: 'auto 8px 48px', padding: 8, background: 'rgba(255,255,255,.92)', fontSize: 12, zIndex: 2 }}>
          {error}
        </div>
      )}
      <span className="visually-hidden">RoAvatar-Renderer {rendered ? 'ready' : 'loading'}</span>
    </div>
  );
}
