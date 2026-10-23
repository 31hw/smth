import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  card: {
    background: 'var(--surface-panel)',
    padding: '4px',
    border: '1px solid var(--text-color-quinary)',
  },
});

export default function OldCard(props) {
  const s = useStyles();
  return <div className={s.card}>
    {props.children}
  </div>
}