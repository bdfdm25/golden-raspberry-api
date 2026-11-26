import { HttpErrorResponse } from '@angular/common/http';
import { describeApiError } from './api-error';

function responseWith(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('describeApiError', () => {
  it('shows the message the API reported', () => {
    const error = responseWith(400, { error: { message: 'Invalid query parameters' } });

    expect(describeApiError(error)).toBe('Invalid query parameters');
  });

  it('appends the first field detail, which names the offending parameter', () => {
    const error = responseWith(400, {
      error: {
        message: 'Invalid query parameters',
        details: [{ field: 'yearr', message: 'yearr is not a supported query parameter' }],
      },
    });

    expect(describeApiError(error)).toBe(
      'Invalid query parameters: yearr is not a supported query parameter',
    );
  });

  it('explains an unreachable API instead of showing status zero', () => {
    expect(describeApiError(responseWith(0, null))).toBe(
      'A API não respondeu. Confira se ela está no ar.',
    );
  });

  it('falls back to the status when the body is not the documented shape', () => {
    expect(describeApiError(responseWith(502, '<html>bad gateway</html>'))).toBe(
      'A API respondeu 502.',
    );
  });

  it('handles something that is not an HTTP response at all', () => {
    expect(describeApiError(new Error('boom'))).toBe('Não foi possível falar com a API.');
  });
});
