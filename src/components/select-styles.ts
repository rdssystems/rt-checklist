const customSelectStyles = {
  control: (provided: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...provided,
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
    boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--primary))' : 'none',
    padding: '0.15rem',
    backgroundColor: 'hsl(var(--background))',
    '&:hover': {
      borderColor: 'hsl(var(--primary))',
    },
  }),
  option: (provided: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...provided,
    backgroundColor: state.isSelected ? 'hsl(var(--primary))' : state.isFocused ? 'hsl(var(--muted))' : 'transparent',
    color: state.isSelected ? 'white' : 'inherit',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'hsl(var(--primary))',
    },
  }),
  menu: (provided: Record<string, unknown>) => ({
    ...provided,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    zIndex: 50,
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
  }),
  singleValue: (provided: Record<string, unknown>) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
  }),
};

export default customSelectStyles;
