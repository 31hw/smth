import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createUseStyles } from 'react-jss';
import Theme2016 from '../components/theme2016';
import PlayerImage from '../components/playerImage';
import ItemImage from '../components/itemImage';
import AuthenticationStore from '../stores/authentication';
import { getUserInfo } from '../services/users';
import { getCollectibleInventory } from '../services/inventory';

const useStyles = createUseStyles({
  page: {
    maxWidth: '970px!important',
    paddingTop: '12px',
  },
  card: {
    background: 'var(--white-color)',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: 4,
    padding: 18,
    color: 'var(--text-color-primary)',
    width: '100%',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 600,
    margin: 0,
  },
  lookupForm: {
    display: 'flex',
    gap: 6,
  },
  lookupInput: {
    padding: '5px 10px',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: 3,
    fontSize: 14,
    width: 170,
    background: 'var(--background-color)',
    color: 'var(--text-color-primary)',
  },
  lookupBtn: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: 3,
    background: '#00a2ff',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: 16,
    '@media(max-width: 991px)': {
      display: 'block',
    },
  },
  leftCard: {
    background: 'var(--background-color)',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: 4,
    padding: 16,
    marginBottom: 14,
  },
  userName: {
    fontSize: 26,
    fontWeight: 600,
    lineHeight: '1.2em',
    marginBottom: 10,
    wordBreak: 'break-word',
  },
  rapLabel: {
    textTransform: 'uppercase',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: 1,
    color: 'var(--text-color-secondary)',
    marginBottom: 4,
  },
  totalRap: {
    fontSize: 28,
    fontWeight: 700,
    color: '#02b757',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 12,
  },
  itemCard: {
    border: '1px solid var(--text-color-quinary)',
    borderRadius: 4,
    overflow: 'hidden',
    background: 'var(--background-color)',
  },
  thumbWrap: {
    position: 'relative',
    aspectRatio: '1 / 1',
    background: 'var(--white-color)',
  },
  limitedTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    background: '#02b757',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 700,
    lineHeight: '16px',
    padding: '0 6px',
    textTransform: 'uppercase',
    borderRadius: 2,
  },
  itemBody: {
    padding: 10,
  },
  line: {
    margin: '0 0 2px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: 13,
  },
  price: {
    margin: '2px 0',
    color: '#02b757',
    fontWeight: 700,
    fontSize: 16,
  },
});

const CollectiblesPage = () => {
  const s = useStyles();
  const router = useRouter();
  const auth = AuthenticationStore.useContainer();
  const effectiveUserId = Number(router.query.userId || auth.userId || 261);

  const [lookupInput, setLookupInput] = useState(String(effectiveUserId));
  const [username, setUsername] = useState('');
  const [inventory, setInventory] = useState([]);
  const [totalRap, setTotalRap] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!effectiveUserId || effectiveUserId < 1) {
      setLoading(false);
      setErrorMessage('Enter a valid Roblox User ID to view Collectibles & RAP.');
      return;
    }
    setLookupInput(String(effectiveUserId));
    setLoading(true);
    setErrorMessage(null);

    (async () => {
      try {
        const userInfo = await getUserInfo({ userId: effectiveUserId });
        if (cancelled) return;
        setUsername(userInfo?.name || `User ${effectiveUserId}`);

        let cursor = '';
        let runs = 0;
        let all = [];
        while (runs < 10) {
          runs++;
          const page = await getCollectibleInventory({
            userId: effectiveUserId,
            cursor,
            limit: 100,
          });
          const data = page?.data || [];
          all = all.concat(data);
          if (!page?.nextPageCursor) break;
          cursor = page.nextPageCursor;
        }
        if (cancelled) return;
        all.sort((a, b) => (b?.recentAveragePrice || 0) - (a?.recentAveragePrice || 0));
        const sumRap = all.reduce((sum, item) => sum + (item?.recentAveragePrice || 0), 0);
        setInventory(all);
        setTotalRap(sumRap);
      } catch (_) {
        if (!cancelled) {
          setErrorMessage(
            "Unable to load this player's collectible inventory (their inventory may be private)."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveUserId]);

  return (
    <Theme2016>
      <Head>
        <title>{username ? `${username}'s Collectibles - ROBLOX` : 'Collectibles - ROBLOX'}</title>
      </Head>
      <div className={`container ${s.page}`}>
        <div className="row mb-4">
          <div className="col-12">
            <div className={s.card}>
              <div className={s.headerRow}>
                <h2 className={s.sectionTitle}>Collectibles &amp; RAP</h2>
                <form
                  className={s.lookupForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const id = Number(lookupInput.trim());
                    if (id > 0) router.push(`/collectibles?userId=${id}`);
                  }}
                >
                  <input
                    className={s.lookupInput}
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    placeholder="User ID (e.g. 261)"
                  />
                  <button type="submit" className={s.lookupBtn}>
                    View User
                  </button>
                </form>
              </div>

              {loading ? (
                <p>Loading collectible inventory...</p>
              ) : errorMessage ? (
                <p className="text-danger mb-0">{errorMessage}</p>
              ) : (
                <div className={s.topGrid}>
                  <div>
                    <div className={s.leftCard}>
                      <h1 className={s.userName}>
                        <a href={`/users/${effectiveUserId}/profile`}>{username}</a>
                      </h1>
                      <PlayerImage id={effectiveUserId} name={username} />
                    </div>
                    <div className={s.leftCard}>
                      <p className={s.rapLabel}>Total RAP</p>
                      <p className={s.totalRap}>R$ {Number(totalRap || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-3">
                      Showing <b>{inventory.length.toLocaleString()}</b> collectible item
                      {inventory.length === 1 ? '' : 's'}.
                    </p>
                    {inventory.length === 0 ? (
                      <p>Player does not have any public collectible items.</p>
                    ) : (
                      <div className={s.grid}>
                        {inventory.map((item, index) => {
                          const assetId = item.assetId;
                          const serial = item.serialNumber;
                          const uaid = item.userAssetId;
                          const rap = item.recentAveragePrice || 0;
                          return (
                            <div key={`${assetId}-${uaid || index}`} className={s.itemCard}>
                              <a href={`/catalog/${assetId}/--`}>
                                <div className={s.thumbWrap}>
                                  <ItemImage id={assetId} name={item.name} />
                                  <span className={s.limitedTag}>Limited</span>
                                </div>
                              </a>
                              <div className={s.itemBody}>
                                <p className={s.line} title={item.name}>
                                  <b>{item.name || `Asset ${assetId}`}</b>
                                </p>
                                <p className={s.price}>R$ {Number(rap).toLocaleString()}</p>
                                {serial != null ? (
                                  <p className={s.line}>Serial: #{serial}</p>
                                ) : (
                                  <p className={s.line}>UAID: {uaid || '-'}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Theme2016>
  );
};

export default CollectiblesPage;
