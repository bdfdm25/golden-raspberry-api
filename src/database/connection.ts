import Database from 'better-sqlite3';

export type AppDatabase = Database.Database;

const SCHEMA = `
  CREATE TABLE movies (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    year    INTEGER NOT NULL,
    title   TEXT    NOT NULL,
    studios TEXT    NOT NULL,
    winner  INTEGER NOT NULL CHECK (winner IN (0, 1))
  );

  CREATE TABLE producers (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
  );

  CREATE TABLE movie_producers (
    movie_id    INTEGER NOT NULL REFERENCES movies (id) ON DELETE CASCADE,
    producer_id INTEGER NOT NULL REFERENCES producers (id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, producer_id)
  );

  CREATE INDEX idx_movies_year ON movies (year);
  CREATE INDEX idx_movies_winner ON movies (winner);
  CREATE INDEX idx_movie_producers_producer ON movie_producers (producer_id);
`;

export function createInMemoryDatabase(): AppDatabase {
  const database = new Database(':memory:');
  database.pragma('foreign_keys = ON');
  database.exec(SCHEMA);
  return database;
}
