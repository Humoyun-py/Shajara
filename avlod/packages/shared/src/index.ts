export * from './enums';
export * from './dates';
export * from './schemas';
export * from './relationships';
export * from './api';

/** Builds a display name from Uzbek name parts. */
export function fullName(p: {
  givenName: string;
  familyName?: string | null;
  patronymic?: string | null;
}): string {
  return [p.familyName, p.givenName, p.patronymic].filter(Boolean).join(' ');
}
