import qs from 'qs';

/**
 * Build a query string from an object
 */
export function buildQueryString(params: Record<string, any>): string {
  return qs.stringify(params, {
    arrayFormat: 'brackets',
    skipNulls: true,
    encode: true,
  });
}

/**
 * Parse a query string into an object
 */
export function parseQueryString(queryString: string): Record<string, any> {
  return qs.parse(queryString, {
    ignoreQueryPrefix: true,
    decoder: (str) => {
      try {
        // Try to parse as JSON first
        return JSON.parse(str);
      } catch {
        // If not JSON, return as string
        return str;
      }
    },
  });
}

/**
 * Append query parameters to a URL
 */
export function appendQueryParams(url: string, params: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const queryString = buildQueryString(params);
  if (!queryString) {
    return url;
  }

  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
}