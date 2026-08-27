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
import { QuantityStepper } from '../test-examples/component-harness/quantity-stepper';
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
    QuantityStepper,
  ],
  templateUrl: './test-guide.html',
  styleUrl: './test-guide.scss',
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
