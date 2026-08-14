import { Component, inject } from '@angular/core';
import { MessageService } from './message.service';

@Component({
  selector: 'app-message-panel',
  template: `
    <p data-testid="message">{{ messageService.message() }}</p>

    <button type="button" data-testid="update" (click)="update()">
      Update message
    </button>
  `,
})
export class MessagePanel {
  readonly messageService = inject(MessageService);

  update(): void {
    this.messageService.setMessage('Updated from the component!');
  }
}
