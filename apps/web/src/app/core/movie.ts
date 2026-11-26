export interface Movie {
  id: number;
  year: number;
  title: string;
  studios: string;
  producers: string[];
  winner: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MoviePage {
  data: Movie[];
  pagination: Pagination;
}

export interface ProducerAwardInterval {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
}

export interface AwardIntervalSummary {
  min: ProducerAwardInterval[];
  max: ProducerAwardInterval[];
}

export interface Health {
  status: string;
  movies: number;
}

export interface MovieFilters {
  page: number;
  limit: number;
  year: number | undefined;
  winner: boolean | undefined;
}
