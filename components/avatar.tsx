import { useState } from 'react';
import type { Account } from '@/lib/types';

function safeImageUrl(value?: string | null): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* Invalid archive URLs use initials instead. */ }
}

export function Avatar({ account, size }: { account: Account; size: 24 | 48 }) {
  const src = safeImageUrl(account.avatar_media_url);
  const [failedSrc, setFailedSrc] = useState<string>();
  const className = 'rounded-full flex-shrink-0 bg-gray-200 object-cover';
  if (src && src !== failedSrc) {
    // Archive hosts vary. Load directly to avoid proxying arbitrary URLs through the server.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={className}
      loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />;
  }
  return <span aria-hidden="true" className={`${className} flex items-center justify-center text-gray-700 text-xs font-bold`}
    style={{ width: size, height: size }}>{account.username.charAt(0).toUpperCase()}</span>;
}
