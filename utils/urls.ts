// utils/urls.ts

/**
 * Gets the base URL for API requests based on the current environment
 * @returns The base URL to use for API requests
 */
export function getBaseUrl() {
    // Browser environment - use relative URLs
    if (typeof window !== 'undefined') {
        return '';
    }

    // Server environment - need absolute URLs

    // 1. First priority: Explicit base URL from env
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    }

    // 2. Second priority: Vercel deployment URL
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // 3. Fallback for local development
    return 'http://localhost:3000';
}

/**
 * Constructs an absolute URL for an API endpoint
 * @param path - The API route path (e.g., '/api/random-accounts')
 * @returns Full URL to the API endpoint
 */
export function getApiUrl(path: string): string {
    const baseUrl = getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

    // Example usage:
export async function fetchAccounts() {
    const response = await fetch(getApiUrl('/api/random-accounts'));
    return response.json();
}

export async function fetchTweet(accountId: string) {
    const response = await fetch(getApiUrl(`/api/random-tweet?account_id=${accountId}`));
    return response.json();
}