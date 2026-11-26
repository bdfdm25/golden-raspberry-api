import { z } from 'zod';
import { HttpError } from '../shared/http-error.js';

const MAX_LIMIT = 100;

const movieQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
  year: z.coerce.number().int().min(1).max(9999).optional(),
  winner: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type MovieQuery = z.infer<typeof movieQuerySchema>;

export function parseMovieQuery(query: unknown): MovieQuery {
  const result = movieQuerySchema.safeParse(query);

  if (!result.success) {
    throw HttpError.badRequest(
      'Invalid query parameters',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return result.data;
}
