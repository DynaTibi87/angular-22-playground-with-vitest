// Loads the Angular JIT compiler so partially-compiled Angular libraries
// (e.g. PlatformLocation from @angular/common) can be compiled at test runtime.
import '@angular/compiler';

// Registers Angular fixture snapshot serializers with Vitest's expect.
import '@analogjs/vitest-angular/setup-snapshots';

import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

// Initializes the Angular testing environment with zoneless change detection,
// matching this application's runtime configuration.
setupTestBed();
