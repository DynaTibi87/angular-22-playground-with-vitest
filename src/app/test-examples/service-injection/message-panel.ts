import { Component, inject, signal } from '@angular/core';
import { MessageService } from './message.service';

@Component({
  selector: 'app-message-panel',
  template: `
    <p data-testid="message">{{ messageService.message() }}</p>

    <p data-testid="service-name">Powered by: {{ serviceName }}</p>

    <button type="button" data-testid="update" (click)="update()">
      Update message
    </button>
  `,
})
export class MessagePanel {
  readonly messageService = inject(MessageService);

  // The base text of the message that lives in the component.
  static readonly COMPONENT_MESSAGE = 'Hello from the component!';

  // Human-readable name of the injected service, surfaced in the template.
  readonly serviceName = MessageService.name;

  // Tracks how many times the update button has been clicked.
  readonly clickCount = signal(0);

  update(): void {
    this.clickCount.update((count) => count + 1);

    // The service decides which message becomes the new value (toggling
    // between this one and its own) and annotates it with the method name.
    this.messageService.toggleMessage(MessagePanel.COMPONENT_MESSAGE);
  }
}
