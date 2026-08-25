import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MessagePanel } from './message-panel';
import { MessageService } from './message.service';

describe('MessagePanel', () => {
  let fixture: ComponentFixture<MessagePanel>;
  let debugElement: DebugElement;
  let componentInstance: MessagePanel;
  let message: DebugElement;
  let updateButton: DebugElement;

  beforeEach(async () => {
    // `MessageService` is `providedIn: 'root'`, so the TestBed provides it
    // automatically - no need to list it under `providers`.
    TestBed.configureTestingModule({
      imports: [MessagePanel],
    });

    fixture = TestBed.createComponent(MessagePanel);
    debugElement = fixture.debugElement;

    message = debugElement.query(By.css('[data-testid="message"]'));
    updateButton = debugElement.query(By.css('[data-testid="update"]'));

    componentInstance = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should render', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render elements', () => {
    expect(message).toBeTruthy();
    expect(updateButton).toBeTruthy();
  });

  it('should render the initial message from the service', () => {
    // The template consumes the service's public read-only signal.
    expect(message.properties['innerHTML']).toContain(
      'Hello from the service!',
    );
  });

  describe('injecting the service via the TestBed injector', () => {
    // `TestBed.inject()` resolves the token from the root/module injector.
    // Because the component uses the root-provided service, this returns the
    // exact same instance the component consumes.
    it('should resolve the service from the TestBed', () => {
      const service = TestBed.inject(MessageService);

      expect(service).toBeInstanceOf(MessageService);
      expect(service.message()).toBe('Hello from the service!');
    });

    it('should reflect service updates in the template', async () => {
      const service = TestBed.inject(MessageService);

      // Drive the state through the service's public method.
      service.setMessage('Set from the TestBed injector');
      await fixture.whenStable();

      expect(service.message()).toBe('Set from the TestBed injector');
      expect(message.properties['innerHTML']).toContain(
        'Set from the TestBed injector',
      );
    });
  });

  describe('injecting the service via the DebugElement injector', () => {
    // Every DebugElement exposes the element-level injector through
    // `debugElement.injector`. Resolving the service here walks the injector
    // tree, so it returns the same root instance the component received.
    it('should resolve the service from the DebugElement injector', () => {
      const service = debugElement.injector.get(MessageService);

      expect(service).toBeInstanceOf(MessageService);
      // It is the very same instance the component injected...
      expect(service).toBe(componentInstance.messageService);
      // ...and the same instance the TestBed injector resolves.
      expect(service).toBe(TestBed.inject(MessageService));
    });

    it('should reflect service updates in the template', async () => {
      const service = debugElement.injector.get(MessageService);

      // Drive the state through the service's public method.
      service.setMessage('Set from the DebugElement injector');
      await fixture.whenStable();

      expect(service.message()).toBe('Set from the DebugElement injector');
      expect(message.properties['innerHTML']).toContain(
        'Set from the DebugElement injector',
      );
    });
  });

  it('should toggle between the component and service messages on each click', async () => {
    const service = TestBed.inject(MessageService);

    // First click: the component-owned message wins, and the service stamps
    // the name of the method that performed the update onto the value.
    updateButton.nativeElement.click();
    await fixture.whenStable();

    expect(service.message()).toContain(MessagePanel.COMPONENT_MESSAGE);
    expect(service.message()).toContain('toggleMessage');
    expect(message.properties['innerHTML']).toContain(
      MessagePanel.COMPONENT_MESSAGE,
    );
    expect(message.properties['innerHTML']).toContain('toggleMessage');

    // Second click: the service-owned message wins, still annotated by the
    // service with the method name.
    updateButton.nativeElement.click();
    await fixture.whenStable();

    expect(service.message()).toContain(MessageService.SERVICE_MESSAGE);
    expect(service.message()).toContain('toggleMessage');
    expect(message.properties['innerHTML']).toContain(
      MessageService.SERVICE_MESSAGE,
    );

    // Third click: back to the component-owned message.
    updateButton.nativeElement.click();
    await fixture.whenStable();

    expect(service.message()).toContain(MessagePanel.COMPONENT_MESSAGE);
  });
});
