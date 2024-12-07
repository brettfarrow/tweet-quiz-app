// utils/fetch.ts

const DEFAULT_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

/**
 * Enhanced fetch function with retry logic
 */
export async function fetchWithRetry<T>(
  url: string, 
  options: FetchOptions = {}
): Promise<T> {
  const { retries = DEFAULT_RETRY_COUNT, retryDelay = RETRY_DELAY, ...fetchOptions } = options;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        // Ensure we have proper headers
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Ensure we fully read the response body
      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch (e) {
        console.error(e);
        throw new Error(`Failed to parse JSON response: ${text}`);
      }
    } catch (error: unknown) {
      if (attempt === retries) {
        throw new Error(`Failed after ${retries} retries: ${error instanceof Error ? error.message : String(error)}`);
      }
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Unexpected end of retry loop');
}
