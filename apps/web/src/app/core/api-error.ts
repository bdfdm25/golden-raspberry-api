import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  error?: { message?: string; details?: { field?: string; message?: string }[] };
}

/**
 * The API answers every failure with { error: { message, details? } }. Showing that message
 * is more useful than a generic one: it names the offending query parameter.
 */
export function describeApiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Não foi possível falar com a API.';
  }

  return readApiMessage(error.error) ?? describeStatus(error.status);
}

function readApiMessage(body: unknown): string | undefined {
  const reported = (body as ApiErrorBody | null)?.error;

  if (reported?.message === undefined) {
    return undefined;
  }

  const detail = reported.details?.[0]?.message;
  return detail === undefined ? reported.message : `${reported.message}: ${detail}`;
}

function describeStatus(status: number): string {
  return status === 0
    ? 'A API não respondeu. Confira se ela está no ar.'
    : `A API respondeu ${String(status)}.`;
}
