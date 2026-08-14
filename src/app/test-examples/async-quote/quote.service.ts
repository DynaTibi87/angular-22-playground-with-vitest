import { Service } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export const FUNNY_SENTENCES: readonly string[] = [
  'My code has no bugs. Just features I have not apologized for yet.',
  'I would tell a UDP joke, but you might not get it.',
  'It works on my machine. We ship my machine to the customer.',
  'CSS is easy. I only cried twice centering this div.',
  'I do not have commitment issues. My last commit was "final final v3".',
  'My unit tests are green. I deleted the ones that were not.',
  'I fixed the flaky test by running it until it passed. Once.',
  'Our estimates are accurate. We just measure them in regret.',
  'I refactored for two days to save one line. Worth it, allegedly.',
  'The bug was not reproducible. Then it reproduced in production.',
  'I use dark mode so the errors are harder to see.',
  'My CSS specificity is like my self-esteem. One !important away from collapse.',
  'I gave the intern prod access. Now we both learned something.',
  'It is not legacy code if I wrote it this morning and already regret it.',
];

@Service()
export class QuoteService {
  // Simulated network latency, exposed so tests can drive timers deterministically.
  static readonly DELAY_MS = 1000;

  fetchQuote(): Observable<string> {
    const index = Math.floor(Math.random() * FUNNY_SENTENCES.length);
    const sentence = FUNNY_SENTENCES[index];

    return of(sentence).pipe(delay(QuoteService.DELAY_MS));
  }
}
