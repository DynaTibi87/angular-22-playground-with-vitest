import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideState, provideStore } from '@ngrx/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { FastCheckDemo } from './fast-check-demo';
import { walletFeature } from './wallet/wallet.reducer';

// A light smoke test for the page component: it renders the invariant list and
// hosts the live wallet widget. The wallet's behaviour is covered by the
// dedicated specs; here we just confirm the page composes correctly.
describe('FastCheckDemo', () => {
  let fixture: ComponentFixture<FastCheckDemo>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FastCheckDemo],
      providers: [provideStore(), provideState(walletFeature)],
    });

    fixture = TestBed.createComponent(FastCheckDemo);
    debugElement = fixture.debugElement;
    await fixture.whenStable();
  });

  it('renders the page heading', () => {
    expect(debugElement.query(By.css('h1')).nativeElement.textContent).toContain(
      'Property-based testing',
    );
  });

  it('lists one item per declared invariant', () => {
    const items = debugElement.queryAll(
      By.css('[data-testid="invariants"] li'),
    );
    expect(items).toHaveLength(fixture.componentInstance['invariants'].length);
  });

  it('embeds the live wallet widget', () => {
    expect(debugElement.query(By.css('app-wallet-panel'))).toBeTruthy();
  });
});

