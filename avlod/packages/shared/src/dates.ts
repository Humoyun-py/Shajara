/**
 * Historical dates are often incomplete. A PartialDate may know only the year,
 * year + month, or the full day, and can be flagged as approximate.
 */
export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
  approximate: boolean;
}

export const EMPTY_DATE: PartialDate = { year: null, month: null, day: null, approximate: false };

const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

export function isPartialDateValid(d: PartialDate): boolean {
  if (d.month !== null && d.year === null) return false;
  if (d.day !== null && d.month === null) return false;
  if (d.year !== null && d.month !== null && d.day !== null) {
    const date = new Date(Date.UTC(d.year, d.month - 1, d.day));
    return date.getUTCMonth() === d.month - 1 && date.getUTCDate() === d.day;
  }
  return true;
}

export function formatPartialDate(d: PartialDate | null | undefined): string {
  if (!d || d.year === null) return "Noma'lum";
  const prefix = d.approximate ? 'taxm. ' : '';
  if (d.month === null) return `${prefix}${d.year}`;
  const month = MONTHS_UZ[d.month - 1] ?? '';
  if (d.day === null) return `${prefix}${month} ${d.year}`;
  return `${prefix}${d.day}-${month} ${d.year}`;
}

export function formatLifespan(
  birth: PartialDate,
  death: PartialDate,
  isLiving: boolean | null,
): string {
  const b = birth.year === null ? '?' : `${birth.approximate ? '~' : ''}${birth.year}`;
  if (isLiving === true && death.year === null) return `${b} —`;
  if (death.year === null) return isLiving === false ? `${b} – ?` : b;
  return `${b} – ${death.approximate ? '~' : ''}${death.year}`;
}

/** Sort key: unknown dates sort last. */
export function partialDateSortKey(d: PartialDate): number {
  if (d.year === null) return Number.MAX_SAFE_INTEGER;
  return d.year * 10000 + (d.month ?? 0) * 100 + (d.day ?? 0);
}
