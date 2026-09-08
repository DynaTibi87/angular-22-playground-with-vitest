import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideState, provideStore } from '@ngrx/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { WalletPanel } from './wallet-panel';
import { walletFeature } from './wallet.reducer';

// Component tests for the WalletPanel. Here we deliberately use the REAL NgRx
// store (provideStore + provideState) rather than a mock: the component's job is
// simply to render store state and dispatch actions, so exercising the real
// store proves the wiring end to end. The interesting *rules* are already
// covered exhaustively by the reducer's property tests.
describe('WalletPanel', () => {
  let fixture: ComponentFixture<WalletPanel>;
  let debugElement: DebugElement;

  const query = (testId: string): DebugElement =>
    debugElement.query(By.css(`[data-testid="${testId}"]`));

  const text = (testId: string): string =>
    query(testId).nativeElement.textContent.trim();

  // Types a new amount into the input, mirroring a real user.
  async function typeAmount(cents: number): Promise<void> {
    const input = query('amount').nativeElement as HTMLInputElement;
    input.value = String(cents);
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function click(testId: string): Promise<void> {
    query(testId).nativeElement.click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [WalletPanel],
      // The same providers the /fast-check route registers.
      providers: [provideStore(), provideState(walletFeature)],
    });

    fixture = TestBed.createComponent(WalletPanel);
    debugElement = fixture.debugElement;
    await fixture.whenStable();
  });

  it('renders an empty wallet initially', () => {
    expect(text('balance')).toContain('$0.00');
    expect(query('empty')).toBeTruthy();
    expect(query('history')).toBeFalsy();
    expect(text('counts')).toContain('0 deposit(s) · 0 withdrawal(s)');
  });

  it('deposits the typed amount and reflects it in the store-derived view', async () => {
    await typeAmount(1234);
    await click('deposit');

    expect(text('balance')).toContain('$12.34');
    expect(text('counts')).toContain('1 deposit(s) · 0 withdrawal(s)');
    expect(query('history').nativeElement.textContent).toContain('deposit');
  });

  it('withdraws from an existing balance', async () => {
    await typeAmount(1000);
    await click('deposit');
    await typeAmount(400);
    await click('withdraw');

    expect(text('balance')).toContain('$6.00');
    expect(text('counts')).toContain('1 deposit(s) · 1 withdrawal(s)');
  });

  it('shows an error when overdrawing and can dismiss it', async () => {
    await typeAmount(5000);
    await click('withdraw'); // nothing deposited yet

    expect(query('error')).toBeTruthy();
    expect(text('error')).toContain('Insufficient funds');
    // The refused withdrawal did not change the balance.
    expect(text('balance')).toContain('$0.00');

    await click('dismiss');
    expect(query('error')).toBeFalsy();
  });

  it('resets the wallet back to empty', async () => {
    await typeAmount(2500);
    await click('deposit');
    expect(text('balance')).toContain('$25.00');

    await click('reset');

    expect(text('balance')).toContain('$0.00');
    expect(query('empty')).toBeTruthy();
  });
});
