import { useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';
import getFlag from '../lib/getFlag';
import { getItemDetails, searchCatalog } from '../services/catalog';
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
    default:
      return 0;
  }
};

const stringToSubCategory = (str = '') => {
  switch (String(str).toLowerCase().trim()) {
    case 'items':
    case 'all':
      return '';
    case 'hats':
      return 'HeadAccessories';
    case 'hair':
      return 'HairAccessories';
    case 'face':
    case 'faces':
      return 'Faces';
    case 'packages':
      return 'Bundles';
    case 'shirts':
      return 'ClassicShirts';
    case 'tshirts':
      return 'ClassicTShirts';
    case 'pants':
      return 'ClassicPants';
    case 'gear':
    case 'building':
    case 'explosive':
    case 'melee':
    case 'musical':
    case 'navigation':
    case 'powerup':
    case 'ranged':
    case 'social':
    case 'transport':
      return 'Gear';
    default:
      return str || '';
  }
};

const CatalogPageStore = createContainer(() => {
  const router = useRouter();
  const [query, setQuery] = useState(router.query.keyword || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(getFlag('catalogPageLimit', 28));
  const [category, setCategory] = useState('Featured');
  const [subCategory, setSubCategory] = useState('');
  const [locked, setLocked] = useState(false);
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [previousCursor, setPreviousCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [sort, setSort] = useState(0);
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    setLocked(true);
    let response = null;
    searchCatalog({
      category,
      subCategory: stringToSubCategory(subCategory) || subCategory,
      query,
      limit,
      cursor,
      sort,
    })
      .then((result) => {
        response = result || { data: [] };
        if (!Array.isArray(response.data) || response.data.length === 0) {
          return { data: { data: [] } };
        }
        return getItemDetails(response.data.map((v) => v.id));
      })
      .then((assetDetails) => {
        const detailList = assetDetails?.data?.data || [];
        const arr = [];
        for (const item of response?.data || []) {
          const details = detailList.find((v) => v.id === item.id);
          if (details) arr.push(details);
        }
        const finalResp = {
          ...response,
          data: arr,
        };
        setResults(finalResp);
        setNextCursor(response?.nextPageCursor || null);
        setPreviousCursor(response?.previousPageCursor || null);
        setTotal(typeof response?._total === 'number' ? response._total : null);
      })
      .catch((err) => {
        console.warn('[catalogPage] search error', err);
        setResults({ data: [] });
        setNextCursor(null);
        setPreviousCursor(null);
      })
      .finally(() => {
        setLocked(false);
      });
  }, [cursor, sort, category, subCategory, genres, query, limit]);

  const clearStatesForNewQuery = () => {
    setCursor(null);
    setPage(1);
  };

  return {
    locked,
    results,
    total,
    nextCursor,
    previousCursor,
    setCursor,
    sort,
    setSort,
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
  };
});

export default CatalogPageStore;
