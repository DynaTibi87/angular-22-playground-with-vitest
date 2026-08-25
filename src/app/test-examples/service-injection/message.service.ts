import { Service, Signal, signal } from '@angular/core';

@Service()
export class MessageService {
  // The base text of the message that lives in the service itself.
  static readonly SERVICE_MESSAGE = 'Hello from the service!';

  private readonly _message = signal(MessageService.SERVICE_MESSAGE);
  readonly message: Signal<string> = this._message.asReadonly();

  // Tracks whose message should be shown on the next toggle.
  private showServiceMessage = false;

  setMessage(value: string): void {
    this._message.set(value);
  }

  // Decides which message becomes the new value: it alternates between the
  // component-provided message and the service's own message. The resulting
  // text is annotated with the name of the method that performed the update.
  toggleMessage(componentMessage: string): void {
    const base = this.showServiceMessage
      ? MessageService.SERVICE_MESSAGE
      : componentMessage;

    this.showServiceMessage = !this.showServiceMessage;

    this._message.set(
      `${base} Updated via the service's ${this.toggleMessage.name} method.`,
    );
  }
}
