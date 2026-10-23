import { useEffect, useRef, useState } from 'react';
import { createContainer } from 'unstated-next';
import getFlag from '../lib/getFlag';
import { getItemDetails, searchCatalog } from '../services/catalog';
import { getUserIdByUsername } from '../services/users';
import { useRouter } from 'next/router';

const stringToCategory = (str = '') => {
  switch (String(str).toLowerCase().trim()) {
    case 'collectible':
    case 'collectibles':
      return 2;
    case 'featured':
      return 0;
    case 'all':
      return 1;
    case 'accessories':
      return 11;
    case 'clothing':
      return 3;
    case 'gears':
    case 'gear':
      return 5;
    case 'bodyparts':
      return 4;
    case 'emotes':
    case 'avataranimations':
      return 12;
    default:
      return 0;
  }
};

const stringToSubCategory = (str = '') => str || '';

const CatalogPageStore = createContainer(() => {
  const router = useRouter();
  const initialKeyword = router.query.keyword || '';
  const [query, setQuery] = useState(initialKeyword);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(getFlag('catalogPageLimit', 28));
  const [category, setCategory] = useState(initialKeyword ? 'All' : 'Featured');
  const [subCategory, setSubCategory] = useState('');
  const [locked, setLocked] = useState(false);
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [previousCursor, setPreviousCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);
  const [sort, setSort] = useState(0);
  const [genres, setGenres] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState('default'); // 'default' | 'all' | 'roblox' | 'custom'
  const [creatorName, setCreatorName] = useState('');
  const [includeNotForSale, setIncludeNotForSale] = useState(false);
  const reqSeq = useRef(0);

  useEffect(() => {
    const mySeq = ++reqSeq.current;
    setLocked(true);
    let response = null;

    let creatorType = null;
    let creatorId = null;
    let effectiveCreatorName = null;
    if (creatorFilter === 'roblox') {
      creatorType = 'User';
      creatorId = 1;
    } else if (creatorFilter === 'custom' && creatorName.trim()) {
      effectiveCreatorName = creatorName.trim();
    }

    const resolveCreator = async () => {
      // Resolve a typed creator name to a numeric Roblox user id (the catalog search
      // endpoints reliably support creatorTargetId + creatorType, but not creatorName).
      if (!effectiveCreatorName) return { creatorType, creatorId, creatorName: null };
      try {
        const resolvedId = await getUserIdByUsername(effectiveCreatorName);
        if (resolvedId) {
          return { creatorType: 'User', creatorId: Number(resolvedId), creatorName: null };
        }
      } catch (_) {
        // fall through to creatorName param
      }
      return { creatorType: null, creatorId: null, creatorName: effectiveCreatorName };
    };

    resolveCreator()
      .then((creator) =>
        searchCatalog({
          category:
            creatorFilter === 'all' && String(category).toLowerCase() === 'featured'
              ? 'All'
              : category,
          subCategory,
          query,
          limit,
          cursor,
          sort,
          genres,
          minPrice,
          maxPrice,
          freeOnly,
          creatorType: creator.creatorType,
          creatorId: creator.creatorId,
          creatorName: creator.creatorName,
          includeNotForSale,
        })
      )
      .then((result) => {
        response = result || { data: [] };
        if (!Array.isArray(response.data) || response.data.length === 0) {
          return { data: { data: [] }, alreadyNormalized: true };
        }
        if (response._normalized) {
          return { data: { data: response.data }, alreadyNormalized: true };
        }
        return getItemDetails(
          response.data.map((v) => ({
            id: v.id,
            itemType: v.itemType || 'Asset',
          }))
        );
      })
      .then((assetDetails) => {
        if (mySeq !== reqSeq.current) return;
        const detailList = assetDetails?.data?.data || [];
        let arr = [];
        if (assetDetails?.alreadyNormalized) {
          arr = detailList;
        } else {
          for (const item of response?.data || []) {
            const itemType = item.itemType || 'Asset';
            const details = detailList.find(
              (v) => v.id === item.id && (v.itemType || 'Asset') === itemType
            );
            if (details) arr.push(details);
          }
        }
        setResults({
          ...response,
          data: arr,
        });
        setNextCursor(response?.nextPageCursor || null);
        setPreviousCursor(response?.previousPageCursor || null);
        setTotal(typeof response?._total === 'number' ? response._total : null);
      })
      .catch((err) => {
        if (mySeq !== reqSeq.current) return;
        console.warn('[catalogPage] search error', err);
        setResults({ data: [] });
        setNextCursor(null);
        setPreviousCursor(null);
      })
      .finally(() => {
        if (mySeq === reqSeq.current) {
          setLocked(false);
        }
      });
  }, [
    cursor,
    sort,
    category,
    subCategory,
    genres,
    minPrice,
    maxPrice,
    freeOnly,
    creatorFilter,
    creatorName,
    includeNotForSale,
    query,
    limit,
  ]);

  const clearStatesForNewQuery = () => {
    setCursor(null);
    setCursorStack([null]);
    setPage(1);
  };

  const goToNextPage = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    setCursor(nextCursor);
    setPage((prev) => prev + 1);
  };

  const goToPreviousPage = () => {
    if (cursorStack.length <= 1) return;
    const nextStack = cursorStack.slice(0, -1);
    setCursorStack(nextStack);
    setCursor(nextStack[nextStack.length - 1] ?? null);
    setPage((prev) => Math.max(prev - 1, 1));
  };

  return {
    locked,
    results,
    total,
    nextCursor,
    previousCursor,
    setCursor,
    sort,
    setSort: (newSort) => {
      clearStatesForNewQuery();
      setSort(newSort);
    },
    category,
    setCategory: (newCat) => {
      clearStatesForNewQuery();
      setCategory(newCat);
    },
    stringToCategory,
    subCategory,
    setSubCategory: (newSubCat) => {
      clearStatesForNewQuery();
      setSubCategory(newSubCat);
    },
    stringToSubCategory,
    genres,
    setGenres: (newGenres) => {
      clearStatesForNewQuery();
      setGenres(newGenres);
    },
    minPrice,
    maxPrice,
    freeOnly,
    setPriceFilter: ({ min = '', max = '', free = false }) => {
      clearStatesForNewQuery();
      setMinPrice(min);
      setMaxPrice(max);
      setFreeOnly(Boolean(free));
    },
    creatorFilter,
    creatorName,
    setCreator: ({ mode = 'default', name = '' }) => {
      clearStatesForNewQuery();
      setCreatorFilter(mode);
      setCreatorName(name);
    },
    includeNotForSale,
    setIncludeNotForSale: (val) => {
      clearStatesForNewQuery();
      setIncludeNotForSale(Boolean(val));
    },
    resetFilters: () => {
      clearStatesForNewQuery();
      setGenres([]);
      setMinPrice('');
      setMaxPrice('');
      setFreeOnly(false);
      setCreatorFilter('default');
      setCreatorName('');
      setIncludeNotForSale(false);
    },
    query,
    setQuery: (newQuery) => {
      clearStatesForNewQuery();
      setQuery(newQuery);
    },
    limit,
    setLimit: (newLimit) => {
      clearStatesForNewQuery();
      setLimit(newLimit);
    },
    page,
    setPage,
    goToNextPage,
    goToPreviousPage,
    hasPreviousPage: cursorStack.length > 1,
  };
});

export default CatalogPageStore;
