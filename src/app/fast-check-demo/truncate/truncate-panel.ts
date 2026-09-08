import { Component, computed, signal } from '@angular/core';
import { TruncatePipe } from './truncate.pipe';

// The Truncate widget: a live playground for the `truncate` pipe. You type text,
// drag the limit slider and pick a trail marker, and the pipe renders the result
// in the template. The same pure function shown here is the one the property
// tests hammer with fast-check — this panel just makes it tangible.
@Component({
  selector: 'app-truncate-panel',
  imports: [TruncatePipe],
  template: `
    <h3>Truncate</h3>

    <label class="truncate__field">
      Text
      <textarea
        rows="2"
        data-testid="text"
        [value]="text()"
        (input)="onTextInput($event)"
      ></textarea>
    </label>

    <label class="truncate__field truncate__field--inline">
      Limit
      <input
        type="range"
        min="0"
        max="60"
        step="1"
        data-testid="limit"
        [value]="limit()"
        (input)="onLimitInput($event)"
      />
      <span class="truncate__limit-value" data-testid="limit-value">
        {{ limit() }}
      </span>
    </label>

    <label class="truncate__field truncate__field--inline">
      Trail
      <input
        type="text"
        maxlength="6"
        data-testid="trail"
        [value]="trail()"
        (input)="onTrailInput($event)"
      />
    </label>

    <div class="truncate__output">
      <span class="truncate__label">Result</span>
      <output data-testid="result" class="truncate__result">
        {{ text() | truncate: limit() : trail() }}
      </output>
    </div>

    <p class="truncate__meta" data-testid="meta">
      @if (wasTruncated()) {
        Truncated — showing {{ limit() }} of {{ text().length }} characters.
      } @else {
        Fits within the limit — shown in full.
      }
    </p>
  `,
  styleUrl: './truncate-panel.scss',
})
export class TruncatePanel {
  // Local UI state, seeded with a sentence long enough to demo truncation.
  protected readonly text = signal(
    'The quick brown fox jumps over the lazy dog.',
  );
  protected readonly limit = signal(20);
  protected readonly trail = signal('…');

  // Mirrors the pipe's own decision so the caption stays in sync with the view.
  protected readonly wasTruncated = computed(
    () => this.text().length > this.limit(),
  );

  protected onTextInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected onLimitInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.limit.set(Number.isNaN(value) ? 0 : value);
  }

  protected onTrailInput(event: Event): void {
    this.trail.set((event.target as HTMLInputElement).value);
  }
}
