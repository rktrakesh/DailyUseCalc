/** Clears the last successful submission only when a new calculation attempt is invalid. */
export function invalidateSubmittedResultOnValidationFailure(
  validationIssues: readonly unknown[],
  clearSubmittedResult: () => void,
): boolean {
  if (validationIssues.length === 0) return false;
  clearSubmittedResult();
  return true;
}
