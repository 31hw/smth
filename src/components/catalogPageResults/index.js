import React from 'react';
import { createUseStyles } from 'react-jss';
import CatalogPageStore from '../../stores/catalogPage';
import CatalogPageCard from '../catalogPageCard';
import CatalogPagination from '../catalogPagination';
import OldSelect from '../oldSelect';

const useResultStyles = createUseStyles({
  pageTitle: {
    fontSize: '26px',
    fontWeight: 500,
    marginBottom: 4,
    color: 'var(--text-color-primary)',
  },
  pageTitleAlt: {
    fontSize: '14px',
    fontWeight: 700,
    opacity: 1,
    letterSpacing: -0.2,
    color: 'var(--text-color-primary)',
  },
  subtitleText: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-color-secondary)',
  },
  selectWrapper: {
    width: '200px',
    display: 'inline-block',
  },
  sortWrapper: {
    float: 'right',
  },
  sortByLabel: {
    paddingRight: '4px',
    fontWeight: 600,
    color: 'var(--text-color-primary)',
  },
  sortByLabelWrapper: {
    display: 'inline-block',
  },
});

const ResultsContainer = (props) => {
  const store = CatalogPageStore.useContainer();
  const list = store.results?.data || [];
  if (list.length === 0) {
    return (
      <div className="col-12 mt-3 mb-3">
        <p style={{ color: 'var(--text-color-secondary)' }}>No items found matching your filters.</p>
      </div>
    );
  }
  if (!props.showTopFour) {
    return (
      <>
        {list.map((v) => (
          <CatalogPageCard key={`${v.itemType || 'Asset'}-${v.id}`} {...v} />
        ))}
      </>
    );
  }
  return (
    <>
      {list.slice(0, 4).map((v) => (
        <CatalogPageCard key={`${v.itemType || 'Asset'}-${v.id}`} {...v} mode="large" />
      ))}
      {list.slice(4).map((v) => (
        <CatalogPageCard key={`${v.itemType || 'Asset'}-${v.id}`} {...v} />
      ))}
    </>
  );
};

const getDisplayNameForCombination = (cat, subCat) => {
  const c = String(cat || '').toLowerCase();
  const s = String(subCat || '').toLowerCase();

  if (c === 'emotes') {
    if (s === 'bundleanimations') return 'Animation Bundles';
    if (s === 'allanimations') return 'Avatar Animations';
    return 'Emotes';
  }
  if (c === 'bodyparts') {
    if (s === 'heads') return 'Heads';
    if (s === 'dynamicheads') return 'Dynamic Heads';
    if (s === 'faces') return 'Faces';
    if (s === 'packages') return 'Packages';
    return 'All Body Parts';
  }
  if (c === 'clothing') {
    if (s === 'hats') return 'Hats';
    if (s === 'hair') return 'Hair';
    if (s === 'accessories') return 'Accessories';
    if (s === 'shirts' || s === 'shirt') return 'Shirts';
    if (s === 'tshirts' || s === 'teeshirt' || s === 'tshirt') return 'T-Shirts';
    if (s === 'pants') return 'Pants';
    if (s === 'packages') return 'Packages';
    return 'All Clothing';
  }
  if (c === 'gear') {
    if (!s || s === 'all') return 'All Gear';
    return `Gear - ${s.charAt(0).toUpperCase() + s.slice(1)}`;
  }
  if (c === 'collectibles') {
    if (s === 'faces') return 'Collectible Faces';
    if (s === 'hats' || s === 'accessories') return 'Collectible Hats';
    if (s === 'gear') return 'Collectible Gear';
    return 'Collectibles';
  }
  return 'All Items';
};

const CatalogPageResults = () => {
  const s = useResultStyles();
  const store = CatalogPageStore.useContainer();
  const isFeatured = String(store.category || '').toLowerCase() === 'featured';
  const showTopFour = isFeatured && !store.subCategory;

  const getTitle = () => {
    if (isFeatured) {
      return (
        <>
          <h1 className={s.pageTitle}>Featured Items on ROBLOX</h1>
          <p className={s.subtitleText}>Recent items by ROBLOX</p>
        </>
      );
    }
    const title = getDisplayNameForCombination(store.category, store.subCategory);
    const dataLen = store.results?.data?.length || 0;
    const currentOffset = dataLen === 0 ? 0 : (store.page - 1) * store.limit + 1;
    const endOffset = (store.page - 1) * store.limit + dataLen;
    const moreAvailable = store.nextCursor !== null;

    return (
      <>
        <h1 className={s.pageTitleAlt}>{title.toUpperCase()}</h1>
        <p className={s.subtitleText}>
          Showing {dataLen === 0 ? '0' : `${currentOffset.toLocaleString()} - ${endOffset.toLocaleString()}`}{' '}
          {moreAvailable ? 'of many results' : dataLen === 1 ? 'result' : 'results'}
        </p>
      </>
    );
  };

  return (
    <div className="row" style={store.locked ? { opacity: '0.25' } : undefined}>
      <div className="col-6">{getTitle()}</div>
      <div className="col-6">
        <div className={s.sortWrapper}>
          <div className={s.sortByLabelWrapper}>
            <span className={s.sortByLabel}>Sort By: </span>
          </div>
          <div className={s.selectWrapper}>
            <OldSelect
              value={store.sort}
              onChange={(newSort) => {
                store.setSort(parseInt(newSort, 10));
              }}
              options={[
                { key: '0', value: isFeatured ? 'Recent (Roblox)' : 'Relevance' },
                { key: '3', value: 'Recently updated' },
                { key: '2', value: 'Bestselling' },
                { key: '1', value: 'Most Favorited' },
                { key: '4', value: 'Price (Low to High)' },
                { key: '5', value: 'Price (High to Low)' },
              ]}
              disabled={store.locked}
            />
          </div>
        </div>
      </div>
      <div className="col-12">
        <div className="row">
          {store.results ? <ResultsContainer showTopFour={showTopFour} /> : null}
        </div>
        <CatalogPagination />
      </div>
    </div>
  );
};

export default CatalogPageResults;
