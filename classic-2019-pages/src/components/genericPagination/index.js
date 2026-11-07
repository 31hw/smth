import { createUseStyles } from "react-jss";
import CatalogPageStore from "../../stores/catalogPage";

const useStyles = createUseStyles({
  button: {
    color: 'var(--text-color-secondary)',
    fontSize: '15px',
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--legacy-btn-gradient)',
    '&:hover': {
      background: 'var(--legacy-btn-gradient-hover)',
    },
    margin: '0 auto',
    display: 'block',
  },
  col: {
    paddingLeft: 0,
    paddingRight: 0,
  },
})

/**
 * Generic pagination component
 * @param {{onClick: (mode: number) => (e: any) => void; pageCount?: number; page: number;}} props
 */
const GenericPagination = props => {
  const { pageCount, page } = props;
  const s = useStyles();

  return <div className='row'>
    <div className='col-12'>
      <div className='row'>
        <div className={`${s.col} col-3`}>
          <button className={s.button} onClick={props.onClick(-1)}>◄</button>
        </div>
        <div className={`${s.col} col-6`}>
          <p className='mb-0 pl-2 pr-2 text-center'>
            Page {page} {typeof pageCount === 'number' && ' of ' + pageCount.toLocaleString() || ''}
          </p>
        </div>
        <div className={`${s.col} col-3`}>
          <button className={s.button} onClick={props.onClick(1)}>►</button>
        </div>
      </div>
    </div>
  </div>
}

export default GenericPagination;