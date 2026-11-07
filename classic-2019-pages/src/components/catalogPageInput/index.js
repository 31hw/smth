import { useEffect, useRef } from 'react';
import { createUseStyles } from 'react-jss';
import CatalogPageStore from '../../stores/catalogPage';
import buttonStyles from '../../styles/buttons.module.css';

const useInputStyles = createUseStyles({
  input: {
    width: '100%',
    padding: '2px 5px',
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--input-bg)',
    color: 'var(--text-color-primary)',
  },
  select: {
    width: '100%',
    padding: '2px 22px 2px 4px',
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--input-bg)',
    color: 'var(--text-color-primary)',
    appearance: 'none',
  },
  col: {
    padding: 0,
    paddingLeft: '2px',
  },
  caret: {
    position: 'absolute',
    marginLeft: '-21px',
    fontSize: '8px',
    transform: 'rotate(90deg)',
    marginTop: '6px',
    border: '1px solid var(--text-color-quinary)',
    color: 'var(--text-color-primary)',
    paddingLeft: '3px',
    paddingRight: '1px',
    background: 'var(--legacy-btn-gradient)',
    pointerEvents: 'none',
  },
});

const CatalogPageInput = () => {
  const s = useInputStyles();
  const store = CatalogPageStore.useContainer();
  const input = useRef(null);

  useEffect(() => {
    if (input.current) {
      input.current.value = store.query;
    }
  }, [store.query]);

  const submitSearch = (e) => {
    if (e) e.preventDefault();
    const kw = input.current ? input.current.value : '';
    if (kw && String(store.category).toLowerCase() === 'featured') {
      store.setCategory('All');
      store.setSubCategory('');
    }
    store.setQuery(kw);
  };

  const selectedCatValue = (() => {
    const c = String(store.category || '').toLowerCase();
    if (c === 'featured') return 'Featured';
    if (c === 'collectibles') return 'Collectibles';
    if (c === 'clothing') return 'Clothing';
    if (c === 'bodyparts') return 'BodyParts';
    if (c === 'gear') return 'Gear';
    if (c === 'emotes') return 'Emotes';
    return 'All';
  })();

  return (
    <div className="row">
      <div className="col-12 col-lg-8 offset-lg-4">
        <div className="row">
          <div className={`col-12 col-md-6 ${s.col}`}>
            <input
              type="text"
              placeholder="Search catalog..."
              className={s.input}
              ref={input}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch(e);
              }}
            />
          </div>
          <div className={`col-6 col-md-3 ${s.col}`}>
            <select
              disabled={store.locked}
              className={s.select}
              value={selectedCatValue}
              onChange={(e) => {
                const nextCat = e.target.value;
                store.setCategory(nextCat);
                store.setSubCategory(nextCat === 'Emotes' ? 'Emotes' : '');
              }}
            >
              <option value="All">All Categories</option>
              <option value="Featured">Featured (Roblox)</option>
              <option value="Collectibles">Collectibles</option>
              <option value="Clothing">Clothing</option>
              <option value="BodyParts">Body Parts</option>
              <option value="Gear">Gear</option>
              <option value="Emotes">Emotes</option>
            </select>
            <span className={s.caret}>►</span>
          </div>
          <div className={`col-6 col-md-2 ${s.col}`}>
            <button
              disabled={store.locked}
              className={`${buttonStyles.legacyButton} w-100`}
              onClick={submitSearch}
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogPageInput;
