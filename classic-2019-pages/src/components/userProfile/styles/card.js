import { createUseStyles } from "react-jss";

const useCardStyles = createUseStyles({
  card: {
    borderRadius: 0,
    boxShadow: 'none',
    background: 'var(--white-color)',
    color: 'var(--text-color-primary)',
    margin: '0 0 18px',
    border: 0,
  },
});

export default useCardStyles;