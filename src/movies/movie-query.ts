import { z } from 'zod';
import { HttpError } from '../shared/http-error.js';

const MAX_LIMIT = 100;

const movieQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
    year: z.coerce.number().int().min(1).max(9999).optional(),
    winner: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  // Rejects unknown parameters: a typo such as ?yearr=1986 must not be answered
  // with the whole collection as if the filter had been applied.
  .strict();

export type MovieQuery = z.infer<typeof movieQuerySchema>;

interface QueryIssueDetail {
  field: string;
  message: string;
}

type QueryIssue = z.ZodError['issues'][number];

/**
 * Replaces the parser's internal wording with the rule each parameter must follow.
 * `satisfies` makes a new query parameter without a message a compile error, so no
 * runtime fallback is needed.
 */
const FIELD_MESSAGES = {
  page: 'page must be an integer greater than or equal to 1',
  limit: `limit must be an integer between 1 and ${String(MAX_LIMIT)}`,
  year: 'year must be an integer between 1 and 9999',
  winner: 'winner must be either true or false',
} satisfies Record<keyof MovieQuery, string>;

function describeIssue(issue: QueryIssue): QueryIssueDetail[] {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => ({
      field: key,
      message: `${key} is not a supported query parameter`,
    }));
  }

  // The schema is flat and every other issue carries the offending field as its
  // single path segment, which is always one of the keys above.
  const field = issue.path.join('.') as keyof MovieQuery;
  return [{ field, message: FIELD_MESSAGES[field] }];
}

export function parseMovieQuery(query: unknown): MovieQuery {
  const result = movieQuerySchema.safeParse(query);

  if (!result.success) {
    throw HttpError.badRequest(
      'Invalid query parameters',
      result.error.issues.flatMap(describeIssue),
    );
  }

  return result.data;
}
