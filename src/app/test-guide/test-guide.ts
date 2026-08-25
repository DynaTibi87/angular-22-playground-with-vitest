import { Component, signal } from '@angular/core';
import { Counter } from '../test-examples/counter/counter';
import { Greeting } from '../test-examples/greeting/greeting';
import { NameField } from '../test-examples/name-field/name-field';
import { QuotePanel } from '../test-examples/async-quote/quote-panel';
import { MessagePanel } from '../test-examples/service-injection/message-panel';
import { UserPanel } from '../test-examples/http-user/user-panel';
import { FeatureTogglePanel } from '../test-examples/spy-feature-toggle/feature-toggle-panel';

// Aggregates every test-example component into a single, browsable page.
// Each example is rendered live inside a labeled "widget" card and the cards
// flow into a responsive CSS grid.
@Component({
  selector: 'app-test-guide',
  imports: [
    Counter,
    Greeting,
    NameField,
    QuotePanel,
    MessagePanel,
    UserPanel,
    FeatureTogglePanel,
  ],
  template: `
    <header class="page-header">
      <h1>Test Guide</h1>
      <p>Live playground of the components exercised by the Vitest examples.</p>
    </header>

    <section class="widget-grid">
      <article class="widget">
        <h2 class="widget__title">Counter</h2>
        <p class="widget__desc">
          Signal-driven state with increment / decrement.
        </p>
        <div class="widget__body">
          <app-counter />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Greeting</h2>
        <p class="widget__desc">Required input plus an output event.</p>
        <div class="widget__body">
          <app-greeting [name]="greetingName()" (greeted)="onGreeted($event)" />
          <p class="widget__note">
            <code>name</code> (input signal) = “{{ greetingName() }}”
          </p>
          <button type="button" class="widget__action" (click)="shuffleName()">
            Shuffle name
          </button>
          @if (lastGreeting()) {
            <p class="widget__note">Last emitted: “{{ lastGreeting() }}”</p>
          }
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Name field</h2>
        <p class="widget__desc">
          Two-way-like sync between an input and a signal.
        </p>
        <div class="widget__body">
          <app-name-field />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Async quote</h2>
        <p class="widget__desc">Service call with a simulated network delay.</p>
        <div class="widget__body">
          <app-quote-panel />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Service injection</h2>
        <p class="widget__desc">
          Shared signal state through an injected service.
        </p>
        <div class="widget__body">
          <app-message-panel />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">HTTP user lookup</h2>
        <p class="widget__desc">
          HttpClient request tested with HttpTestingController.
        </p>
        <div class="widget__body">
          <app-user-panel />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Feature toggle spying</h2>
        <p class="widget__desc">
          Service interactions verified and stubbed with Vitest spies.
        </p>
        <div class="widget__body">
          <app-feature-toggle-panel />
        </div>
      </article>
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      color: #1f2933;
      font-family:
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        'Helvetica Neue',
        Arial,
        sans-serif;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      margin: 0 0 0.25rem;
      font-size: 2rem;
    }

    .page-header p {
      margin: 0;
      color: #52606d;
    }

    .widget-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      align-items: start;
    }

    .widget {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.25rem;
      border: 1px solid #e4e7eb;
      border-radius: 12px;
      background: #ffffff;
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.04),
        0 4px 12px rgba(15, 23, 42, 0.06);
    }

    .widget__title {
      margin: 0;
      font-size: 1.1rem;
    }

    .widget__desc {
      margin: 0;
      color: #7b8794;
      font-size: 0.85rem;
    }

    .widget__body {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px dashed #e4e7eb;
    }

    .widget__note {
      margin: 0.5rem 0 0;
      font-size: 0.8rem;
      color: #3e4c59;
    }

    .widget__note code {
      padding: 0.05rem 0.3rem;
      border-radius: 4px;
      background: #eef2f7;
      font-size: 0.78rem;
    }

    .widget__action {
      margin-top: 0.5rem;
      align-self: flex-start;
      padding: 0.35rem 0.75rem;
      border: 1px solid #cbd2d9;
      border-radius: 6px;
      background: #f5f7fa;
      color: #1f2933;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .widget__action:hover {
      background: #e4e7eb;
    }
  `,
})
export class TestGuide {
  // Candidate names for the Greeting component's required input.
  private readonly nameOptions = [
    'Ada',
    'Grace',
    'Alan',
    'Linus',
    'Margaret',
  ] as const;

  // The Greeting component declares a required input, so we feed it a value
  // chosen at random from the options above.
  readonly greetingName = signal(this.pickRandomName());

  // Capture the Greeting component's output so we can surface it in the card.
  readonly lastGreeting = signal('');

  shuffleName(): void {
    this.greetingName.set(this.pickRandomName());
  }

  onGreeted(message: string): void {
    this.lastGreeting.set(message);
  }

  private pickRandomName(): string {
    const index = Math.floor(Math.random() * this.nameOptions.length);
    return this.nameOptions[index];
  }
}
