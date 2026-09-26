import { describe, expect, it } from 'vitest';
import { pageCountFor } from './StepPager';

describe('pageCountFor', () => {
  it('gives one page per 8 steps', () => {
    expect(pageCountFor(8)).toBe(1);
    expect(pageCountFor(16)).toBe(2);
    expect(pageCountFor(24)).toBe(3);
    expect(pageCountFor(32)).toBe(4);
  });

  it('rounds up a partial final page', () => {
    expect(pageCountFor(9)).toBe(2);
  });

  it('is always at least 1', () => {
    expect(pageCountFor(1)).toBe(1);
  });

  it('respects a custom page size', () => {
    expect(pageCountFor(16, 4)).toBe(4);
  });
});
