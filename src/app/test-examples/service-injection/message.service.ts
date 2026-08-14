import { Service, Signal, signal } from '@angular/core';

@Service()
export class MessageService {
  private readonly _message = signal('Hello from the service!');
  readonly message: Signal<string> = this._message.asReadonly();

  setMessage(value: string): void {
    this._message.set(value);
  }
}
