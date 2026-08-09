export const SITE_NAME = 'DailyUseCalc';
export const SITE_URL = 'https://dailyusecalc.com';

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}
