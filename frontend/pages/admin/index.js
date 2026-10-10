import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createUseStyles } from 'react-jss';
import AuthenticationStore from '../../stores/authentication';
import { getWebIcons, replaceWebIcon } from '../../services/webIcons';

const useStyles = createUseStyles({
  page: {
    maxWidth: 1240,
    margin: '18px auto 48px',
    padding: '0 16px',
    color: 'var(--text-color-primary)',
  },
  pageTitle: {
    margin: '0 0 16px',
    fontSize: 30,
    fontWeight: 600,
  },
  topTabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid #c7c7c7',
    marginBottom: 18,
  },
  topTab: {
    border: 0,
    borderBottom: '3px solid transparent',
    background: 'transparent',
    padding: '10px 18px',
    color: 'inherit',
    fontSize: 16,
    fontWeight: 600,
  },
  selectedTopTab: {
    borderBottomColor: 'var(--primary-color)',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '190px minmax(0, 1fr)',
    gap: 18,
    '@media(max-width: 680px)': {
      gridTemplateColumns: '1fr',
    },
  },
  sideNav: {
    padding: 12,
    border: '1px solid #d5d5d5',
    borderRadius: 4,
    alignSelf: 'start',
  },
  sideNavTitle: {
    margin: '0 0 8px',
    color: '#777',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
  },
  sideLink: {
    width: '100%',
    border: 0,
    borderRadius: 3,
    background: '#f0f0f0',
    color: 'var(--text-color-primary)',
    padding: '9px 10px',
    textAlign: 'left',
    fontWeight: 600,
  },
  content: {
    minWidth: 0,
  },
  sectionHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 600,
  },
  sectionDescription: {
    margin: '5px 0 0',
    color: '#666',
    fontSize: 14,
  },
  tools: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  search: {
    width: 230,
    maxWidth: '100%',
    minHeight: 36,
    border: '1px solid #a7a7a7',
    borderRadius: 3,
    padding: '6px 10px',
    fontSize: 14,
  },
  button: {
    minHeight: 36,
    border: '1px solid #9b9b9b',
    borderRadius: 3,
    background: '#fff',
    color: '#222',
    padding: '7px 12px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    '&:disabled': {
      cursor: 'wait',
      opacity: 0.55,
    },
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  card: {
    minWidth: 0,
    border: '1px solid #d0d0d0',
    borderRadius: 4,
    background: 'var(--white-color)',
    overflow: 'hidden',
  },
  preview: {
    height: 144,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    background: '#f4f4f4',
    borderBottom: '1px solid #dedede',
    '& img': {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
    },
  },
  cardBody: {
    padding: 12,
  },
  fileName: {
    overflowWrap: 'anywhere',
    margin: '0 0 4px',
    fontSize: 14,
    fontWeight: 700,
  },
  filePath: {
    display: 'block',
    minHeight: 34,
    overflowWrap: 'anywhere',
    color: '#666',
    fontSize: 12,
  },
  metadata: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    margin: '10px 0',
    color: '#666',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  feedback: {
    margin: '0 0 14px',
    padding: '10px 12px',
    border: '1px solid #a7c7a7',
    borderRadius: 3,
    background: '#eff9ef',
    color: '#285d28',
    overflowWrap: 'anywhere',
  },
  error: {
    borderColor: '#d7a2a2',
    background: '#fff2f2',
    color: '#812929',
  },
  status: {
    padding: '40px 20px',
    border: '1px solid #d5d5d5',
    borderRadius: 4,
    background: '#fff',
    textAlign: 'center',
  },
  hiddenInput: {
    display: 'none',
  },
});

const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg,.webp,.gif,.svg,.avif,.tif,.tiff';

function formatBytes(value) {
  if (!Number.isFinite(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
}

export default function AdminPage() {
  const styles = useStyles();
  const auth = AuthenticationStore.useContainer();
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);
  const [icons, setIcons] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPath, setUploadingPath] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadIcons = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await getWebIcons();
      setIcons(Array.isArray(result.icons) ? result.icons : []);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The web icons could not be loaded.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.isPending && auth.isAuthenticated && auth.isStaff) loadIcons();
  }, [auth.isPending, auth.isAuthenticated, auth.isStaff, loadIcons]);

  const visibleIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return icons;
    return icons.filter((icon) => `${icon.name} ${icon.path} ${icon.contentType}`.toLowerCase().includes(query));
  }, [icons, search]);

  const chooseReplacement = (icon) => {
    uploadTargetRef.current = icon;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const uploadReplacement = async (event) => {
    const file = event.target.files?.[0];
    const icon = uploadTargetRef.current;
    if (!file || !icon) return;
    setUploadingPath(icon.path);
    setFeedback(null);
    try {
      const result = await replaceWebIcon({ path: icon.path, file });
      if (result.icon) {
        setIcons((current) => current.map((item) => item.path === icon.path ? { ...item, ...result.icon } : item));
      }
      setFeedback({ type: 'success', text: result.message || `${icon.name} was replaced successfully.` });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The icon could not be replaced.' });
    } finally {
      setUploadingPath('');
      uploadTargetRef.current = null;
      event.target.value = '';
    }
  };

  if (auth.isPending) {
    return <main className={styles.page}><Head><title>Admin Panel - Zekoro</title></Head><div className={styles.status}>Checking administrator access…</div></main>;
  }
  if (!auth.isAuthenticated) {
    return <main className={styles.page}><Head><title>Admin - Zekoro</title></Head><div className={styles.status}>Sign in with an administrator account to access this panel.</div></main>;
  }
  if (!auth.isStaff) {
    return <main className={styles.page}><Head><title>Admin - Zekoro</title></Head><div className={styles.status}>You do not have permission to access the admin panel.</div></main>;
  }

  return (
    <main className={styles.page}>
      <Head><title>Admin Panel - Zekoro</title></Head>
      <h1 className={styles.pageTitle}>Admin Panel</h1>
      <div className={styles.topTabs} role="tablist" aria-label="Admin panel sections">
        <button className={`${styles.topTab} ${styles.selectedTopTab}`} role="tab" aria-selected="true" type="button">Web</button>
      </div>
      <div className={styles.layout}>
        <aside className={styles.sideNav} aria-label="Web administration">
          <h2 className={styles.sideNavTitle}>Web</h2>
          <button className={styles.sideLink} type="button" aria-current="page">Icons</button>
        </aside>
        <section className={styles.content} aria-labelledby="web-icons-heading">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle} id="web-icons-heading">Icons</h2>
              <p className={styles.sectionDescription}>Browse the public web images and replace an existing icon without changing its URL or file format.</p>
            </div>
            <div className={styles.tools}>
              <input
                className={styles.search}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search icons"
                aria-label="Search icons"
              />
              <button className={styles.button} type="button" onClick={loadIcons} disabled={loading || Boolean(uploadingPath)}>
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>

          {feedback && (
            <div className={`${styles.feedback} ${feedback.type === 'error' ? styles.error : ''}`} role="status">
              {feedback.text}
            </div>
          )}

          <input
            ref={fileInputRef}
            className={styles.hiddenInput}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={uploadReplacement}
            aria-label="Choose a replacement image"
          />

          {loading && icons.length === 0 ? (
            <div className={styles.status}>Loading web icons…</div>
          ) : visibleIcons.length === 0 ? (
            <div className={styles.status}>{search ? 'No icons match your search.' : 'No web icons were found.'}</div>
          ) : (
            <div className={styles.grid}>
              {visibleIcons.map((icon) => (
                <article className={styles.card} key={icon.path}>
                  <div className={styles.preview}>
                    <img src={`${icon.path}?v=${encodeURIComponent(icon.updatedAt || icon.size || '1')}`} alt={icon.name} loading="lazy" />
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.fileName}>{icon.name}</h3>
                    <span className={styles.filePath}>{icon.path}</span>
                    <div className={styles.metadata}>
                      <span>{icon.extension}</span>
                      <span>{formatBytes(icon.size)}</span>
                    </div>
                    <div className={styles.metadata}>
                      <span>{icon.contentType}</span>
                      <span>{formatDate(icon.updatedAt)}</span>
                    </div>
                    <button
                      className={styles.button}
                      type="button"
                      onClick={() => chooseReplacement(icon)}
                      disabled={!icon.replaceable || Boolean(uploadingPath)}
                      title={icon.replaceable ? `Replace ${icon.path}` : 'This file type cannot be replaced'}
                    >
                      {uploadingPath === icon.path ? 'Uploading…' : 'Replace image'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p style={{ marginTop: 14, color: '#666', fontSize: 12 }}>
            {visibleIcons.length} of {icons.length} image{icons.length === 1 ? '' : 's'}. Uploads are converted to the selected file’s format so existing page references remain valid.
          </p>
        </section>
      </div>
    </main>
  );
}
