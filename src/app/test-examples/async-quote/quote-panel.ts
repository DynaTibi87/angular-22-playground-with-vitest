import { Component, inject, signal } from '@angular/core';
import { QuoteService } from './quote.service';

@Component({
  selector: 'app-quote-panel',
  template: `
    <button type="button" data-testid="load" (click)="loadQuote()">
      Get a funny quote
    </button>

    @if (loading()) {
      <p data-testid="loading">Loading…</p>
    }

    @if (quote()) {
      <p data-testid="quote">{{ quote() }}</p>
    }
  `,
})
export class QuotePanel {
  private readonly quoteService = inject(QuoteService);

  readonly quote = signal('');

  readonly loading = signal(false);

  loadQuote(): void {
    this.loading.set(true);

    this.quoteService.fetchQuote().subscribe((sentence) => {
      this.quote.set(sentence);
      this.loading.set(false);
    });
  }
}
