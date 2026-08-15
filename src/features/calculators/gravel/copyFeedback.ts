export const COPY_FEEDBACK_DURATION_MS = 1_750;

export async function copyTextToClipboard(
  writeText: (text: string) => Promise<void>,
  text: string,
): Promise<boolean> {
  try {
    await writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function restartCopyFeedbackTimer(
  currentTimer: ReturnType<typeof setTimeout> | undefined,
  onElapsed: () => void,
): ReturnType<typeof setTimeout> {
  if (currentTimer !== undefined) clearTimeout(currentTimer);
  return setTimeout(onElapsed, COPY_FEEDBACK_DURATION_MS);
}
