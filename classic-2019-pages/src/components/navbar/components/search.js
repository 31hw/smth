import { useEffect, useRef, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { useRouter } from 'next/router';

const useSearchIconStyles = createUseStyles({
  icon: {
    float: 'right',
    margin: 0,
    padding: 0,
    border: 'none',
    cursor: 'pointer',
    maxHeight: '28px',
    maxWidth: '28px',
  },
  searchIconContainer: {
    width: '20%',
    float: 'right',
    paddingRight: '3px',
  },
});

const SearchIcon = ({ onClick }) => {
  const s = useSearchIconStyles();
  return (
    <div className={s.searchIconContainer} onClick={onClick}>
      <span className={`col-2 ${s.icon} icon-nav-search`} />
    </div>
  );
};

const useSuggestionEntryStyles = createUseStyles({
  text: {
    paddingLeft: '15px',
    fontSize: '15px',
    paddingTop: '0.45rem',
    paddingBottom: '0.45rem',
    marginBottom: 0,
    fontWeight: 400,
    color: 'var(--text-color-primary)',
    '&:hover': {
      boxShadow: '4px 0 0 0 var(--primary-color) inset',
      background: 'var(--surface-hover)',
    },
  },
  link: {
    color: 'var(--text-color-primary)',
    textDecoration: 'none',
  },
});

const SearchSuggestionEntry = ({ url, query, mode, external, onSelect }) => {
  const s = useSuggestionEntryStyles();
  const targetUrl = external ? url : `${url}?keyword=${encodeURIComponent(query)}`;

  return (
    <a
      className={s.link}
      href={targetUrl}
      data-rbx-native={external ? '1' : undefined}
      onClick={onSelect}
    >
      <p className={s.text}>
        Search &quot;{query}&quot; in {mode}
      </p>
    </a>
  );
};

const useSuggestionStyles = createUseStyles({
  container: {
    background: 'var(--white-color)',
    position: 'fixed',
    zIndex: 1200,
    boxShadow: '0 -5px 20px rgb(25 25 25 / 15%)',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: '3px',
    width: 'inherit',
    marginTop: '1px',
  },
});

const SearchSuggestionContainer = ({ query, inputRef, onClose }) => {
  const s = useSuggestionStyles();
  const width = inputRef.current ? `${inputRef.current.clientWidth + 44}px` : '240px';
  return (
    <div className={s.container} style={{ width }}>
      <SearchSuggestionEntry mode="Games" url="/games" query={query} onSelect={onClose} />
      <SearchSuggestionEntry mode="Catalog" url="/catalog" query={query} onSelect={onClose} />
      <SearchSuggestionEntry mode="Players" url="/search/users" query={query} onSelect={onClose} />
      <SearchSuggestionEntry mode="Groups" url="/search/groups" query={query} onSelect={onClose} />
      <SearchSuggestionEntry
        external={true}
        mode="Creator Store"
        url={`https://create.roblox.com/store/models?keyword=${encodeURIComponent(query)}`}
        query={query}
        onSelect={onClose}
      />
    </div>
  );
};

const useSearchStyles = createUseStyles({
  wrapper: {
    padding: 0,
    background: 'var(--input-bg)',
    borderRadius: '3px',
    border: '1px solid var(--text-color-quinary)',
    width: '100%',
    height: '28px!important',
  },
  searchInput: {
    border: 'none',
    padding: 0,
    fontSize: '15px!important',
    marginLeft: '10px',
    marginTop: '2px',
    float: 'left',
    background: 'none',
    color: 'var(--text-color-primary)',
    fontWeight: '400',
    display: 'block',
    lineHeight: '1.5',
    appearance: 'none',
    borderRadius: '5.25px',
    width: 'calc(80% - 12px)',
    '&:focus': {
      border: 'none!important',
      boxShadow: 'none!important',
      outline: 0,
    },
    '&::placeholder': {
      color: '#757575',
    },
  },
  seniorClass: {
    padding: 0,
    margin: 0,
    marginTop: 'auto',
    marginBottom: 'auto',
    '@media(max-width: 991px)': {
      marginLeft: '6px',
      width: 'calc(40% - 6px)',
    },
    '@media(max-width: 400px)': {
      width: 'calc(32% - 6px)',
    },
  },
});

const Search = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const s = useSearchStyles();

  useEffect(() => {
    setShowDropdown(query.trim() !== '');
  }, [query]);

  useEffect(() => {
    const onDocClick = (e) => {
      // composedPath() keeps this working when the navbar is rendered inside
      // the classic chrome's shadow root (e.target is retargeted to the host).
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      const inside = wrapRef.current
        ? path.includes(wrapRef.current) || wrapRef.current.contains(e.target)
        : false;
      if (!inside) setShowDropdown(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const submitSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    router.push(`/games?keyword=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className={`${s.seniorClass} col-12 col-lg-3`} ref={wrapRef}>
      <div style={{ width: '100%' }}>
        <div className={s.wrapper}>
          <input
            ref={inputRef}
            value={query}
            className={`col-10 ${s.searchInput}`}
            placeholder="Search"
            onChange={(v) => setQuery(v.currentTarget.value)}
            onFocus={() => {
              if (query.trim()) setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitSearch();
              }
            }}
          />
          <SearchIcon onClick={submitSearch} />
        </div>
        {showDropdown && (
          <SearchSuggestionContainer
            query={query.trim()}
            inputRef={inputRef}
            onClose={() => setShowDropdown(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Search;
