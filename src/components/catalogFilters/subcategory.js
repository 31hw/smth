import { createUseStyles } from 'react-jss';
import CatalogPageStore from '../../stores/catalogPage';

const useStyles = createUseStyles({
  link: {
    fontSize: '13px',
    lineHeight: '1.55em',
    color: 'var(--text-color-primary)',
  },
  selected: {
    fontWeight: 700,
    color: 'var(--text-color-primary)',
  },
});

const SubCategoryFilter = (props) => {
  const store = CatalogPageStore.useContainer();
  const s = useStyles();
  const currentSub = String(store.subCategory || '').toLowerCase();

  return (
    <>
      {props.subCategories.map((v) => {
        const val = v.value ?? v.displayName;
        const isActive = String(val).toLowerCase() === currentSub;
        return (
          <p
            key={v.displayName}
            onClick={() => {
              if (store.locked) return;
              store.setSubCategory(val);
            }}
            className={`mb-0 ${s.link} ${isActive ? s.selected : 'fake-link'}`}
          >
            {v.displayName}
          </p>
        );
      })}
    </>
  );
};

export default SubCategoryFilter;
