import { forwardRef, useRef } from "react";
import { createUseStyles } from "react-jss";

const useInputStyles = createUseStyles({
  select: {
    width: '100%',
    padding: '2px',
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--input-bg)',
    color: 'var(--text-color-primary)',
    paddingLeft: '2px',
    appearance: 'none',
  },
  col: {
    padding: 0,
    paddingLeft: '2px',
  },
  caret: {
    position: 'absolute',
    marginLeft: '-21px',
    fontSize: '8px',
    transform: 'rotate(90deg)',
    marginTop: '6px',
    border: '1px solid var(--text-color-quinary)',
    color: 'var(--text-color-primary)',
    paddingLeft: '3px',
    paddingRight: '1px',
    background: 'var(--legacy-btn-gradient)',
  },
});

/**
 * Old select component
 * @param {{onChange: (newVal: string) => void; disabled?: boolean; options: {key: string; value: string;}[]}} props 
 * @returns 
 */
const OldSelect = props => {
  const s = useInputStyles();
  return <>
    <select disabled={props.disabled} className={s.select} onChange={(v) => {
      props.onChange(v.currentTarget.value);
    }}>
      {
        props.options.map((v, i) => {
          return <option key={i} value={v.key}>{v.value}</option>
        })
      }
    </select>
    <span className={s.caret}>►</span>
  </>
}

export default OldSelect;