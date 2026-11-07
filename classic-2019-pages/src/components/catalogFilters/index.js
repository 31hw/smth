import React, { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import CatalogPageStore from '../../stores/catalogPage';
import GenreFilter from './genreFilter';
import SubCategoryFilter from './subcategory';
import buttonStyles from '../../styles/buttons.module.css';

const useFilterStyles = createUseStyles({
  headerRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: '16px',
    marginBottom: '6px',
  },
  header: {
    fontSize: '18px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-color-primary)',
  },
  clearLink: {
    fontSize: '12px',
    cursor: 'pointer',
    color: 'var(--primary-color)',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  sectionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
    color: 'var(--text-color-primary)',
  },
  subCategories: {
    paddingLeft: '5px',
  },
  radioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '13px',
    marginBottom: '3px',
    cursor: 'pointer',
    color: 'var(--text-color-primary)',
  },
  miniInput: {
    width: '100%',
    padding: '2px 5px',
    fontSize: '12px',
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--input-bg)',
    color: 'var(--text-color-primary)',
    marginBottom: '4px',
  },
  priceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: 4,
    marginTop: 4,
    alignItems: 'center',
  },
  goBtn: {
    padding: '2px 8px!important',
    fontSize: '12px!important',
    lineHeight: '1.3!important',
  },
});

const SUBCATEGORY_GROUPS = {
  featured: {
    title: 'Featured Type',
    items: [
      { displayName: 'All Featured Items', value: '' },
      { displayName: 'Featured Hats', value: 'Hats' },
      { displayName: 'Featured Gear', value: 'Gear' },
      { displayName: 'Featured Faces', value: 'Faces' },
      { displayName: 'Featured Packages', value: 'Packages' },
    ],
  },
  collectibles: {
    title: 'Collectible Type',
    items: [
      { displayName: 'All Collectibles', value: '' },
      { displayName: 'Collectible Faces', value: 'Faces' },
      { displayName: 'Collectible Hats', value: 'Hats' },
      { displayName: 'Collectible Gear', value: 'Gear' },
    ],
  },
  clothing: {
    title: 'Clothing Type',
    items: [
      { displayName: 'All Clothing', value: 'All' },
      { displayName: 'Hats', value: 'Hats' },
      { displayName: 'Hair', value: 'Hair' },
      { displayName: 'Accessories', value: 'Accessories' },
      { displayName: 'Shirts', value: 'Shirts' },
      { displayName: 'T-Shirts', value: 'TShirts' },
      { displayName: 'Pants', value: 'Pants' },
      { displayName: 'Packages', value: 'Packages' },
    ],
  },
  bodyparts: {
    title: 'Body Part Type',
    items: [
      { displayName: 'All Body Parts', value: 'All' },
      { displayName: 'Heads', value: 'Heads' },
      { displayName: 'Dynamic Heads', value: 'DynamicHeads' },
      { displayName: 'Faces', value: 'Faces' },
      { displayName: 'Packages', value: 'Packages' },
    ],
  },
  gear: {
    title: 'Gear Category',
    items: [
      { displayName: 'All Gear', value: 'all' },
      { displayName: 'Melee', value: 'melee' },
      { displayName: 'Ranged', value: 'ranged' },
      { displayName: 'Explosive', value: 'explosive' },
      { displayName: 'Power Up', value: 'powerup' },
      { displayName: 'Navigation', value: 'navigation' },
      { displayName: 'Musical', value: 'musical' },
      { displayName: 'Social', value: 'social' },
      { displayName: 'Building', value: 'building' },
      { displayName: 'Transport', value: 'transport' },
    ],
  },
  emotes: {
    title: 'Animation Type',
    items: [
      { displayName: 'Emotes', value: 'Emotes' },
      { displayName: 'Animation Bundles', value: 'BundleAnimations' },
      { displayName: 'All Animations', value: 'AllAnimations' },
    ],
  },
};

const CatalogFilters = () => {
  const s = useFilterStyles();
  const store = CatalogPageStore.useContainer();
  const catLower = String(store.category || '').toLowerCase();
  const subGroup = SUBCATEGORY_GROUPS[catLower] || null;

  const [minDraft, setMinDraft] = useState(store.minPrice || '');
  const [maxDraft, setMaxDraft] = useState(store.maxPrice || '');
  const [creatorDraft, setCreatorDraft] = useState(store.creatorName || '');

  useEffect(() => {
    setMinDraft(store.minPrice || '');
    setMaxDraft(store.maxPrice || '');
  }, [store.minPrice, store.maxPrice]);

  useEffect(() => {
    setCreatorDraft(store.creatorName || '');
  }, [store.creatorName]);

  const effectiveCreatorRadio =
    store.creatorFilter === 'default'
      ? catLower === 'featured'
        ? 'roblox'
        : 'all'
      : store.creatorFilter;

  const hasCustomPrice = Boolean(store.minPrice !== '' || store.maxPrice !== '');

  return (
    <div className="row">
      <div className="col-12">
        <div className={s.headerRow}>
          <h2 className={s.header}>Filters</h2>
          <span className={s.clearLink} onClick={() => store.resetFilters()}>
            Reset
          </span>
        </div>
      </div>

      <div className="col-12">
        {subGroup && (
          <>
            <div>
              <p className={s.sectionLabel}>{subGroup.title}</p>
              <div className={s.subCategories}>
                <SubCategoryFilter subCategories={subGroup.items} />
              </div>
            </div>
            <div className="divider-top mt-3 mb-3 divider-light" />
          </>
        )}

        {/* Creator Filter */}
        <div>
          <p className={s.sectionLabel}>Creator</p>
          <label className={s.radioRow}>
            <input
              type="radio"
              name="catalog_creator_filter"
              checked={effectiveCreatorRadio === 'all'}
              onChange={() => store.setCreator({ mode: 'all', name: '' })}
            />
            <span>All Creators</span>
          </label>
          <label className={s.radioRow}>
            <input
              type="radio"
              name="catalog_creator_filter"
              checked={effectiveCreatorRadio === 'roblox'}
              onChange={() => store.setCreator({ mode: 'roblox', name: '' })}
            />
            <span>Roblox</span>
          </label>
          <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
            <input
              type="text"
              placeholder="Creator name"
              className={s.miniInput}
              style={{ marginBottom: 0 }}
              value={creatorDraft}
              onChange={(e) => setCreatorDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && creatorDraft.trim()) {
                  store.setCreator({ mode: 'custom', name: creatorDraft.trim() });
                }
              }}
            />
            <button
              type="button"
              className={`${buttonStyles.legacyButton} ${s.goBtn}`}
              onClick={() => {
                if (creatorDraft.trim()) {
                  store.setCreator({ mode: 'custom', name: creatorDraft.trim() });
                } else {
                  store.setCreator({ mode: 'all', name: '' });
                }
              }}
            >
              Go
            </button>
          </div>
        </div>

        <div className="divider-top mt-3 mb-3 divider-light" />

        {/* Price Filter */}
        <div>
          <p className={s.sectionLabel}>Price</p>
          <label className={s.radioRow}>
            <input
              type="radio"
              name="catalog_price_filter"
              checked={!store.freeOnly && !hasCustomPrice}
              onChange={() => store.setPriceFilter({ min: '', max: '', free: false })}
            />
            <span>Any Price</span>
          </label>
          <label className={s.radioRow}>
            <input
              type="radio"
              name="catalog_price_filter"
              checked={store.freeOnly}
              onChange={() => store.setPriceFilter({ min: '', max: '', free: true })}
            />
            <span>Free</span>
          </label>
          <div className={s.priceGrid}>
            <input
              type="number"
              min="0"
              placeholder="Min"
              className={s.miniInput}
              style={{ marginBottom: 0 }}
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Max"
              className={s.miniInput}
              style={{ marginBottom: 0 }}
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
            />
            <button
              type="button"
              className={`${buttonStyles.legacyButton} ${s.goBtn}`}
              onClick={() =>
                store.setPriceFilter({
                  min: minDraft,
                  max: maxDraft,
                  free: false,
                })
              }
            >
              Go
            </button>
          </div>
        </div>

        <div className="divider-top mt-3 mb-3 divider-light" />

        {/* Unavailable Items Filter */}
        <div>
          <p className={s.sectionLabel}>Unavailable Items</p>
          <label className={s.radioRow}>
            <input
              type="checkbox"
              checked={Boolean(store.includeNotForSale)}
              onChange={(e) => store.setIncludeNotForSale(e.target.checked)}
            />
            <span>Show Off-Sale</span>
          </label>
        </div>

        <div className="divider-top mt-3 mb-3 divider-light" />

        {/* Genre Filter */}
        <GenreFilter />
      </div>
    </div>
  );
};

export default CatalogFilters;
