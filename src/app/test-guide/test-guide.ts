import { Component, signal } from '@angular/core';
import { Counter } from '../test-examples/counter/counter';
import { Greeting } from '../test-examples/greeting/greeting';
import { NameField } from '../test-examples/name-field/name-field';
import { QuotePanel } from '../test-examples/async-quote/quote-panel';
import { MessagePanel } from '../test-examples/service-injection/message-panel';
import { UserPanel } from '../test-examples/http-user/user-panel';
import { FeatureTogglePanel } from '../test-examples/spy-feature-toggle/feature-toggle-panel';
import { NavPanel } from '../test-examples/router-navigation/nav-panel';
import { CartPanel } from '../test-examples/cart/cart-panel';
import { Highlight } from '../test-examples/highlight-directive/highlight';
import { TitleCasePipe } from '../test-examples/title-case-pipe/title-case.pipe';
import {
  ProfileCard,
  Profile,
} from '../test-examples/nested-components/profile-card';

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
    NavPanel,
    CartPanel,
    Highlight,
    ProfileCard,
    TitleCasePipe,
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
        <h2 class="widget__title">HTTP user</h2>
        <p class="widget__desc">
          HttpClient request tested with a mocked backend.
        </p>
        <div class="widget__body">
          <app-user-panel />
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
        <h2 class="widget__title">Nested components</h2>
        <p class="widget__desc">
          Service interactions verified and stubbed with Vitest spies.
        </p>
        <div class="widget__body">
          <app-feature-toggle-panel />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Router navigation</h2>
        <p class="widget__desc">
          RouterLink and programmatic navigation tested with
          RouterTestingHarness.
        </p>
        <div class="widget__body">
          <app-nav-panel />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Shopping cart</h2>
        <p class="widget__desc">
          A state-holding service tested in isolation, without a component.
        </p>
        <div class="widget__body">
          <app-cart-panel />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Nested components</h2>
        <p class="widget__desc">
          Parent wiring verified with a real child and a stubbed one.
        </p>
        <div class="widget__body">
          <app-profile-card [profile]="profile()" />
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Highlight directive</h2>
        <p class="widget__desc">
          An attribute directive tested through a host component.
        </p>
        <div class="widget__body">
          <p class="highlight-demo" appHighlight="skyblue">
            Static color (<code>appHighlight="skyblue"</code>)
          </p>
          <p class="highlight-demo" [appHighlight]="highlightColor()">
            Bound color (<code>[appHighlight]</code> = “{{ highlightColor() }}”)
          </p>
          <p class="highlight-demo" appHighlight>
            No value → falls back to the default color
          </p>
          <button
            type="button"
            class="widget__action"
            (click)="shuffleHighlight()"
          >
            Shuffle bound color
          </button>
        </div>
      </article>

      <article class="widget">
        <h2 class="widget__title">Title case pipe</h2>
        <p class="widget__desc">
          A pure pipe transforming text, tested in isolation without TestBed.
        </p>
        <div class="widget__body">
          <input
            type="text"
            class="widget__input"
            [value]="pipeInput()"
            (input)="onPipeInput($event)"
          />
          <p class="widget__note" style="white-space: pre-wrap">
            Output: “{{ pipeInput() | titlecase }}”
          </p>
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
      column-gap: 1.5rem;
      row-gap: 2rem;
      align-items: stretch;
      padding-bottom: 2rem;
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
      flex: 1;
    }

    /*
      The example components have no host styles, so they default to
      display: inline. An inline host does not establish block height for its
      block-level template content, which makes each card under-measure its
      height and paint over the row below. Forcing the embedded hosts to block
      lets their content contribute proper height and stops the overlap.
    */
    .widget__body
      :is(
        app-counter,
        app-greeting,
        app-name-field,
        app-quote-panel,
        app-message-panel,
        app-user-panel,
        app-feature-toggle-panel,
        app-nav-panel,
        app-cart-panel
      ) {
      display: block;
    }

    /* Show which component is which inside the nested-components card. */
    .widget__body .tag {
      margin: 0 0 0.5rem;
      font-size: 0.78rem;
      color: #7b8794;
    }

    .widget__body .tag code {
      padding: 0.05rem 0.3rem;
      border-radius: 4px;
      background: #eef2f7;
      color: #1f2933;
    }

    /* Examples embed their own heading; keep it modest inside the card. */
    .widget__body h3 {
      margin: 0 0 0.5rem;
      font-size: 0.95rem;
      color: #3e4c59;
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

    /* Give the Highlight directive demo lines a little breathing room so the
       painted background is easy to see. */
    .highlight-demo {
      margin: 0 0 0.5rem;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      font-size: 0.85rem;
      color: #1f2933;
    }

    .highlight-demo code {
      padding: 0.05rem 0.3rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.6);
      font-size: 0.78rem;
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

  // The ProfileCard component requires a profile, passed down to its children.
  readonly profile = signal<Profile>({
    name: 'Ada Lovelace',
    role: 'Engineer',
  });

  // Candidate colors for the Highlight directive's bound `appHighlight` input.
  private readonly highlightColors = [
    'cyan',
    'lightgreen',
    'gold',
    'salmon',
    'violet',
  ] as const;

  // Drives the `[appHighlight]` binding in the Highlight directive widget.
  readonly highlightColor = signal<string>(this.highlightColors[0]);

  // Backing value for the Title case pipe demo input.
  readonly pipeInput = signal('the quick brown fox');

  onPipeInput(event: Event): void {
    this.pipeInput.set((event.target as HTMLInputElement).value);
  }

  shuffleName(): void {
    this.greetingName.set(this.pickRandomName());
  }

  shuffleHighlight(): void {
    const index = Math.floor(Math.random() * this.highlightColors.length);
    this.highlightColor.set(this.highlightColors[index]);
  }

  onGreeted(message: string): void {
    this.lastGreeting.set(message);
  }

  private pickRandomName(): string {
    const index = Math.floor(Math.random() * this.nameOptions.length);
    return this.nameOptions[index];
  }
}
