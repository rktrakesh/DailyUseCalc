export function createValidationAssociation(id: string, error?: string) {
  const errorId = `${id}-error`;
  return {
    control: {
      id,
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? errorId : undefined,
    },
    error: error ? { id: errorId } : undefined,
  };
}
