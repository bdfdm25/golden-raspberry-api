import type { ParsedMovie } from '../csv/movie-csv-parser.js';
import { normalizeProducerName } from '../producers/producer-identity.js';
import type { AppDatabase } from './connection.js';

export interface Movie {
  id: number;
  year: number;
  title: string;
  studios: string;
  producers: string[];
  winner: boolean;
}

export interface MovieFilters {
  year?: number | undefined;
  winner?: boolean | undefined;
}

export interface PageRequest {
  limit: number;
  offset: number;
}

export interface MoviePage {
  items: Movie[];
  total: number;
}

export interface ProducerWin {
  producer: string;
  year: number;
}

interface MovieRow {
  id: number;
  year: number;
  title: string;
  studios: string;
  winner: number;
}

interface ProducerRow {
  movie_id: number;
  name: string;
}

/**
 * Returns the winning years of every producer awarded more than once,
 * deduplicated by year and ordered by producer and year.
 */
const REPEAT_WINNERS_QUERY = `
  WITH winning_years AS (
    SELECT DISTINCT p.name AS producer, m.year AS year
    FROM producers p
    JOIN movie_producers mp ON mp.producer_id = p.id
    JOIN movies m ON m.id = mp.movie_id
    WHERE m.winner = 1
  )
  SELECT producer, year
  FROM winning_years
  WHERE producer IN (
    SELECT producer FROM winning_years GROUP BY producer HAVING COUNT(*) > 1
  )
  ORDER BY producer, year
`;

export class MovieRepository {
  constructor(private readonly database: AppDatabase) {}

  insertMany(movies: ParsedMovie[]): void {
    const insertMovie = this.database.prepare(
      'INSERT INTO movies (year, title, studios, winner) VALUES (?, ?, ?, ?)',
    );
    const upsertProducer = this.database.prepare(
      `INSERT INTO producers (name, normalized_name) VALUES (?, ?)
       ON CONFLICT (normalized_name) DO UPDATE SET normalized_name = excluded.normalized_name
       RETURNING id`,
    );
    const linkProducer = this.database.prepare(
      'INSERT INTO movie_producers (movie_id, producer_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
    );

    // Keyed by the normalized name, so name variants resolve to the same producer.
    // The first spelling seen is the one kept for display.
    const producerIds = new Map<string, number>();
    const resolveProducerId = (name: string): number => {
      const key = normalizeProducerName(name);
      const cached = producerIds.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const { id } = upsertProducer.get(name, key) as { id: number };
      producerIds.set(key, id);
      return id;
    };

    const insertAll = this.database.transaction((batch: ParsedMovie[]) => {
      for (const movie of batch) {
        const { lastInsertRowid } = insertMovie.run(
          movie.year,
          movie.title,
          movie.studios,
          movie.winner ? 1 : 0,
        );

        for (const producer of movie.producers) {
          linkProducer.run(lastInsertRowid, resolveProducerId(producer));
        }
      }
    });

    insertAll(movies);
  }

  count(): number {
    const { total } = this.database.prepare('SELECT COUNT(*) AS total FROM movies').get() as {
      total: number;
    };
    return total;
  }

  findPage(filters: MovieFilters, page: PageRequest): MoviePage {
    const { clause, parameters } = buildFilterClause(filters);

    const { total } = this.database
      .prepare(`SELECT COUNT(*) AS total FROM movies ${clause}`)
      .get(...parameters) as { total: number };

    const rows = this.database
      .prepare(
        `SELECT id, year, title, studios, winner FROM movies ${clause}
         ORDER BY year, title, id LIMIT ? OFFSET ?`,
      )
      .all(...parameters, page.limit, page.offset) as MovieRow[];

    return { items: this.attachProducers(rows), total };
  }

  findRepeatWinnerYears(): ProducerWin[] {
    return this.database.prepare(REPEAT_WINNERS_QUERY).all() as ProducerWin[];
  }

  private attachProducers(rows: MovieRow[]): Movie[] {
    if (rows.length === 0) {
      return [];
    }

    const placeholders = rows.map(() => '?').join(', ');
    const producerRows = this.database
      .prepare(
        `SELECT mp.movie_id, p.name
         FROM movie_producers mp
         JOIN producers p ON p.id = mp.producer_id
         WHERE mp.movie_id IN (${placeholders})
         ORDER BY p.name`,
      )
      .all(...rows.map((row) => row.id)) as ProducerRow[];

    const producersByMovie = new Map<number, string[]>();
    for (const { movie_id: movieId, name } of producerRows) {
      const producers = producersByMovie.get(movieId) ?? [];
      producers.push(name);
      producersByMovie.set(movieId, producers);
    }

    return rows.map((row) => ({
      id: row.id,
      year: row.year,
      title: row.title,
      studios: row.studios,
      producers: producersByMovie.get(row.id) ?? [],
      winner: row.winner === 1,
    }));
  }
}

function buildFilterClause(filters: MovieFilters): {
  clause: string;
  parameters: (number | string)[];
} {
  const conditions: string[] = [];
  const parameters: (number | string)[] = [];

  if (filters.year !== undefined) {
    conditions.push('year = ?');
    parameters.push(filters.year);
  }

  if (filters.winner !== undefined) {
    conditions.push('winner = ?');
    parameters.push(filters.winner ? 1 : 0);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    parameters,
  };
}
