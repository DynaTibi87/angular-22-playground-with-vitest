import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Registers a real HttpClient so the UserService widget can make requests
    // at runtime. The specs override this with provideHttpClientTesting().
    provideHttpClient(),
    provideRouter(appRoutes),
  ],
};
