import {createUseStyles} from "react-jss";

const useForumStyles = createUseStyles({
  header: {

  },
  headerRow: {
    background: '#29508d',
    '& th': {
      fontSize: '1.25rem',
      color: '#fff!important',
      fontWeight: 500,
      paddingLeft: '0.25rem',
      paddingTop: '0.5rem',
      paddingBottom: '0.5rem',
    }
  },
  bodyRow: {
    background: 'var(--surface-subtle)',
    '&:hover': {
      background: 'var(--surface-hover)',
    },
  },
  lastPostHeader: {
    minWidth: '110px',
    '@media (max-width: 991px)': {
      minWidth: '72px',
      fontSize: '1rem',
    },
  },
})

export default useForumStyles;
