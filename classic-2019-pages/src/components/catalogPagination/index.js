import CatalogPageStore from '../../stores/catalogPage';
import GenericPagination from '../genericPagination';

const CatalogPagination = () => {
  const store = CatalogPageStore.useContainer();
  const { limit, total, page } = store;
  const dataLen = store.results?.data?.length || 0;

  let pageCount = typeof total === 'number' ? Math.ceil(total / limit) : null;
  if (pageCount === 0) pageCount = 1;
  if (pageCount === null && !store.nextCursor) pageCount = page;

  const onClick = (increment) => (e) => {
    e.preventDefault();
    if (store.locked) return;
    if (increment === 1) {
      if (pageCount !== null && page >= pageCount) return;
      store.goToNextPage();
    } else if (increment === -1) {
      if (!store.hasPreviousPage) return;
      store.goToPreviousPage();
    }
  };

  if (dataLen === 0 && !store.hasPreviousPage) {
    return null;
  }

  return (
    <div className="row">
      <div className="col-6 col-lg-3 mx-auto">
        <GenericPagination page={page} pageCount={pageCount} onClick={onClick} />
      </div>
    </div>
  );
};

export default CatalogPagination;
