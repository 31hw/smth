import { createUseStyles } from "react-jss";

const useFormStyles = createUseStyles({
  accountInfoLabel: {
    marginBottom: '6px',
    color: 'var(--text-color-secondary)',
    fontSize: '15px',
  },
  accountInfoValue: {
    color: 'var(--text-color-secondary)',
  },
  descInput: {
    width: '100%',
    borderRadius: '4px',
    padding: '6px 8px',
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--input-bg)',
    color: 'var(--text-color-primary)',
  },
  select: {
    borderRadius: '2px',
    fontSize: '16px',
    background: 'var(--input-bg)',
    color: 'var(--text-color-primary)',
  },
  disabled: {
    background: 'var(--surface-subtle)!important',
    color: 'var(--text-color-secondary)',
    '&:focus': {
      color: 'var(--text-color-secondary)',
      boxShadow: 'none',
    },
  },
  fakeInput: {
    height: '100%',
    overflow: 'hidden',
  },
  saveButtonWrapper: {
    float: 'right',
    marginTop: '16px',
  },
  saveButton: {
    background: 'var(--white-color)',
    color: 'var(--text-color-primary)',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: '4px',
    fontSize: '16px',
    padding: '4px 8px',
    cursor: 'pointer',
  },
  genderUnselected: {
    color: 'var(--text-color-quinary)',
    cursor: 'pointer',
  },
});

export default useFormStyles;