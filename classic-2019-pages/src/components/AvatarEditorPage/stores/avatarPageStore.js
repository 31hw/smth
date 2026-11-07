import { createContainer } from 'unstated-next';
import { useEffect, useRef, useState } from 'react';
import {
  getAvatarAssetsByType,
  getItemRestrictions,
  getOutfits,
  getRecentItems,
  RECENT_ITEMS,
} from '../../../services/avatar';
import { SUBMENU_MODE } from '../components/avatarTabSubmenu';
import AuthenticationStore from '../../../stores/authentication';
import {
  multiGetAssetThumbnails,
  multiGetBundleThumbnails,
  multiGetOutfitThumbnails,
} from '../../../services/thumbnails';
import AvatarInfoStore from './avatarInfoStore';

const AvatarPageStore = createContainer(() => {
  const [listItems, setListItems] = useState([]);
  const [listItemMetadata, setListItemMetadata] = useState({});
  const [outfits, setOutfits] = useState([]);
  const [selectedList, setSelectedList] = useState({
    tab: 'recent',
    subTab: 'All',
  });
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [thumbnailType, setThumbnailType] = useState(0);
  const auth = AuthenticationStore.useContainer();
  const { setLoadingAvatar, isRendering } = AvatarInfoStore.useContainer();
  const didInitialWithAuth = useRef(false);

  function dedupeByAssetId(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item?.isBundle ? 'B' : 'A'}:${Number(item?.assetId)}`;
      if (!Number.isFinite(Number(item?.assetId))) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function LoadRecentItemsToList(type) {
    setLoadingAvatar(true);
    try {
      const recent = (await getRecentItems(type, auth.userId)).data || [];
      ClearListItems();
      if (recent.length === 0) {
        setListItemMetadata({
          itemsLength: 0,
          pageSize: 50,
          nextPageCursor: null,
          previousPageCursor: null,
          recentType: type,
          listMode: SUBMENU_MODE.DEFAULT,
        });
        return [];
      }
      const ids = recent.map((item) => Number(item.id)).filter(Boolean);
      const [thumbnails, itemRestrictions] = await Promise.all([
        multiGetAssetThumbnails({ assetIds: ids }),
        getItemRestrictions(ids),
      ]);
      const mappedRecent = dedupeByAssetId(
        recent.map((item) => {
          const id = Number(item.id);
          const thumb = thumbnails?.find((v) => Number(v.targetId) === id) || null;
          const rest = itemRestrictions?.find((v) => Number(v.assetId) === id);
          return {
            name: item.name || 'Item',
            assetId: id,
            assetType: Number(item.assetType?.id ?? item.assetType ?? 8),
            thumbnail: thumb?.imageUrl || null,
            thumbnailState: thumb?.state ?? (thumb?.imageUrl ? 'Completed' : 'Pending'),
            isLimited: rest?.isLimited ?? false,
            isLimitedUnique: rest?.isLimitedUnique ?? false,
          };
        })
      );
      setListItems(mappedRecent);
      setListItemMetadata({
        itemsLength: mappedRecent.length,
        pageSize: 50,
        nextPageCursor: null,
        previousPageCursor: null,
        recentType: type,
        listMode: SUBMENU_MODE.DEFAULT,
      });
      return mappedRecent;
    } finally {
      setLoadingAvatar(false);
    }
  }

  async function LoadAssetTypeToList(type, loadMore = false) {
    setLoadingAvatar(true);
    if (!loadMore) ClearListItems();
    try {
      const invList = await getAvatarAssetsByType({
        userId: auth.userId,
        assetTypeId: type,
        cursor: loadMore ? listItemMetadata?.nextPageCursor : null,
        limit: 25,
      });
      const rawItems = invList?.Items || [];
      if (rawItems.length === 0) {
        if (!loadMore) setListItems([]);
        setListItemMetadata({
          itemsLength: 0,
          pageSize: listItemMetadata?.pageSize ?? invList?.ItemsPerPage ?? 25,
          nextPageCursor: null,
          previousPageCursor: invList?.previousPageCursor || null,
          assetType: type,
          listMode: SUBMENU_MODE.DEFAULT,
        });
        return [];
      }

      const bundleIds = rawItems
        .filter((x) => x.Item?.IsBundle)
        .map((x) => Number(x.Item.AssetId))
        .filter(Boolean);
      const assetIds = rawItems
        .filter((x) => !x.Item?.IsBundle)
        .map((x) => Number(x.Item.AssetId))
        .filter(Boolean);

      const [assetThumbs, bundleThumbs, itemRestrictions] = await Promise.all([
        assetIds.length ? multiGetAssetThumbnails({ assetIds }) : Promise.resolve([]),
        bundleIds.length ? multiGetBundleThumbnails({ bundleIds }) : Promise.resolve([]),
        assetIds.length ? getItemRestrictions(assetIds) : Promise.resolve([]),
      ]);

      let newItems = dedupeByAssetId(
        rawItems.map((item) => {
          const isBundle = Boolean(item.Item?.IsBundle);
          const id = Number(item.Item.AssetId);
          const thumb = isBundle
            ? bundleThumbs?.find((v) => Number(v.targetId) === id) || null
            : assetThumbs?.find((v) => Number(v.targetId) === id) || null;
          const rest = !isBundle
            ? itemRestrictions?.find((v) => Number(v.assetId) === id)
            : null;
          return {
            name: item.Item.Name || 'Item',
            assetId: id,
            assetType: Number(item.Item.AssetType || type),
            isBundle,
            bundleOutfitId: item.Item.BundleOutfitId || null,
            bundleAssetIds: item.Item.BundleAssetIds || [],
            thumbnail: thumb?.imageUrl || null,
            thumbnailState: thumb?.state ?? (thumb?.imageUrl ? 'Completed' : 'Pending'),
            isLimited: rest?.isLimited ?? false,
            isLimitedUnique: rest?.isLimitedUnique ?? false,
          };
        })
      );

      if (loadMore) {
        setListItems((prev) => dedupeByAssetId([...prev, ...newItems]));
      } else {
        setListItems(newItems);
      }
      setListItemMetadata({
        itemsLength: newItems.length,
        pageSize: listItemMetadata?.pageSize ?? invList?.ItemsPerPage ?? 25,
        nextPageCursor: invList?.nextPageCursor || null,
        previousPageCursor: invList?.previousPageCursor || null,
        assetType: type,
        listMode: SUBMENU_MODE.DEFAULT,
      });
      return newItems;
    } finally {
      setLoadingAvatar(false);
    }
  }

  async function LoadOutfits() {
    setOutfits([]);
    const outfitsRes = await getOutfits({ userId: auth.userId, limit: 50 });
    if (!outfitsRes?.data?.length) return outfitsRes;

    const outfitThumbnails = await multiGetOutfitThumbnails({
      userOutfitIds: outfitsRes.data.map((v) => v.id),
      size: '150x150',
    });
    setOutfits(
      outfitsRes.data.map((outfit) => {
        const outfitThumb = outfitThumbnails?.find((v) => Number(v.targetId) === Number(outfit.id)) || null;
        return {
          name: outfit.name,
          outfitId: outfit.id,
          createdAt: outfit.created,
          thumbnail: outfitThumb?.imageUrl || null,
          thumbnailState: outfitThumb?.state ?? (outfitThumb?.imageUrl ? 'Completed' : 'Pending'),
        };
      })
    );
    return outfitsRes;
  }

  function LoadNewThumbnailType(nextThumbnailType) {
    if (isRendering) return;
    setThumbnailType(nextThumbnailType);
  }

  function ClearListItems() {
    setListItems([]);
    setListItemMetadata({});
  }

  useEffect(() => {
    LoadRecentItemsToList(RECENT_ITEMS.ALL);
  }, []);

  useEffect(() => {
    if (!auth.userId || didInitialWithAuth.current) return;
    didInitialWithAuth.current = true;
    if (listItems.length === 0 && selectedList.tab === 'recent') {
      LoadRecentItemsToList(listItemMetadata?.recentType || RECENT_ITEMS.ALL);
    } else if (listItems.length === 0 && listItemMetadata?.assetType) {
      LoadAssetTypeToList(listItemMetadata.assetType, false);
    }
  }, [auth.userId]);

  return {
    LoadRecentItemsToList,
    LoadAssetTypeToList,
    LoadOutfits,
    ClearListItems,
    LoadNewThumbnailType,
    listItems,
    listItemMetadata,
    outfits,
    setOutfits,
    selectedList,
    setSelectedList,
    openSubmenu,
    setOpenSubmenu,
    activeSubmenu,
    setActiveSubmenu,
    activeTab,
    setActiveTab,
    thumbnailType,
  };
});

export default AvatarPageStore;
