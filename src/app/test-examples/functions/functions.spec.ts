import { Functions } from './functions';
import { describe, expect, it } from 'vitest';

describe('Functions', () => {
  const functions = new Functions();

  describe('add', () => {
    it('should add the two numbers together', () => {
      expect(functions.add(2, 3)).toBe(5);
    });

    it('should handle decimals', () => {
      expect(functions.add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });
});
