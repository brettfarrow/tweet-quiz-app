export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().replace(/^@/, '');
  return /^[A-Za-z0-9_]{1,15}$/.test(username) ? username : null;
}

export function isAccountId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,20}$/.test(value);
}
