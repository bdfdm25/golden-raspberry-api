import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'intervals' },
  {
    path: 'intervals',
    title: 'Intervalos entre prêmios',
    loadComponent: () => import('./intervals/intervals-page').then((m) => m.IntervalsPage),
  },
  {
    path: 'movies',
    title: 'Filmes',
    loadComponent: () => import('./movies/movies-page').then((m) => m.MoviesPage),
  },
  { path: '**', redirectTo: 'intervals' },
];
