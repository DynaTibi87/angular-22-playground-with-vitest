import { beforeEach, describe, expect, it } from 'vitest';
import { TitleCasePipe } from './title-case.pipe';

// A pipe is just a class with a single `transform` method, so - unlike
// components and directives - it needs no `TestBed`, fixture, or DOM. We can
// instantiate it directly with `new` and call `transform` like any other
// function. These are plain, fast unit tests with no Angular machinery.
describe('TitleCasePipe', () => {
  // A brand-new pipe instance for every test keeps them fully isolated.
  // `transform` is stateless here, but creating a fresh instance avoids any
  // accidental shared state and mirrors how Angular re-uses the pipe.
  let pipe: TitleCasePipe;

  beforeEach(() => {
    pipe = new TitleCasePipe();
  });

  it('should create an instance', () => {
    // Sanity check that the pipe class can be constructed.
    expect(pipe).toBeTruthy();
  });

  it('should capitalize the first letter of a single word', () => {
    // The lone word is lower-cased then its first letter is upper-cased.
    expect(pipe.transform('angular')).toBe('Angular');
  });

  it('should capitalize the first letter of every word', () => {
    // `\b[a-z]` matches the first letter at each word boundary, so each word
    // in the sentence gets title-cased independently.
    expect(pipe.transform('angular pipe testing')).toBe('Angular Pipe Testing');
  });

  it('should lowercase the remaining letters of each word', () => {
    // Input is first lower-cased, so ALL-CAPS and MiXeD case are normalized
    // before the leading letters are capitalized.
    expect(pipe.transform('ANGULAR')).toBe('Angular');
    expect(pipe.transform('aNGuLAR pIPe')).toBe('Angular Pipe');
  });

  it('should leave an already title-cased string unchanged', () => {
    // Transforming an already formatted value is idempotent - running the pipe
    // twice yields the same result as running it once.
    const once = pipe.transform('Hello World');
    expect(once).toBe('Hello World');
    expect(pipe.transform(once)).toBe('Hello World');
  });

  it('should return an empty string for an empty input', () => {
    // The guard clause handles the falsy empty-string case explicitly.
    expect(pipe.transform('')).toBe('');
  });

  it('should treat a hyphenated word as a single token', () => {
    // The `/\w\S*/g` match runs from a word character to the next whitespace,
    // so a hyphen does NOT start a new word. Only the very first letter of the
    // whole `multi-word` token is capitalized; the rest is lower-cased.
    expect(pipe.transform('multi-word title')).toBe('Multi-word Title');
  });

  it('should preserve the whitespace between words', () => {
    // The regex only ever matches non-whitespace runs, so the spaces between
    // words - even repeated ones - are left exactly as they were.
    expect(pipe.transform('spaced   out')).toBe('Spaced   Out');
  });
});
