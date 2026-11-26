import { InjectionToken } from '@angular/core';

/**
 * Base URL of the API. Defaults to the relative path that both the dev-server proxy and
 * the nginx container forward to the API service, so the browser never makes a
 * cross-origin request: the API deliberately ships without CORS headers.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
