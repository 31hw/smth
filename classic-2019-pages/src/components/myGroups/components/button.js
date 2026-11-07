import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  buttonWrapper: {},
  button: {
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--legacy-btn-gradient)',
    display: 'block',
    textAlign: 'center',
    color: 'var(--text-color-primary)',
    '&:hover': {
      color: 'var(--text-color-primary)',
      background: 'var(--legacy-btn-gradient-hover)',
    }
  },
});

const Button = props => {
  const s = useStyles();
  return <div className={s.buttonWrapper}>
    {props.href ? <a {...props} className={s.button + ' ' + (props.className || '')}>{props.children}</a> :
      <button {...props} className={s.button + ' ' + (props.className || '')}>{props.children}</button>
    }
  </div>
}

export default Button;