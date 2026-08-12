export const currencies = [
  ['USD', '$', 'US Dollar'],
  ['EUR', '€', 'Euro'],
  ['GBP', '£', 'British Pound'],
  ['CAD', 'C$', 'Canadian Dollar'],
  ['AUD', 'A$', 'Australian Dollar'],
  ['NZD', 'NZ$', 'New Zealand Dollar'],
  ['INR', '₹', 'Indian Rupee'],
  ['JPY', '¥', 'Japanese Yen'],
  ['CNY', '¥', 'Chinese Yuan'],
  ['SGD', 'S$', 'Singapore Dollar'],
  ['HKD', 'HK$', 'Hong Kong Dollar'],
  ['CHF', 'CHF', 'Swiss Franc'],
  ['AED', 'د.إ', 'UAE Dirham'],
  ['SAR', 'ر.س', 'Saudi Riyal'],
  ['ZAR', 'R', 'South African Rand'],
  ['BRL', 'R$', 'Brazilian Real'],
  ['MXN', 'MX$', 'Mexican Peso'],
  ['KRW', '₩', 'South Korean Won'],
  ['SEK', 'kr', 'Swedish Krona'],
  ['NOK', 'kr', 'Norwegian Krone'],
] as const;

export type CurrencyCode = (typeof currencies)[number][0];

export function isCurrencyCode(value: string | null): value is CurrencyCode {
  return currencies.some(([code]) => code === value);
}

export function formatMoney(
  value: number,
  currency: CurrencyCode,
  locale?: string,
  maximumFractionDigits?: number,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value);
}
