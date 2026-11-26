import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  // Angular is not up yet, so the console is the only place this can go.
  // eslint-disable-next-line no-console
  console.error(error);
});
