import { describe, expect, it } from 'vitest';
import { noteName } from './noteNames';

describe('noteName', () => {
  it('middle C (60) is C4', () => {
    expect(noteName(60)).toBe('C4');
  });

  it('A4 (69) is A4', () => {
    expect(noteName(69)).toBe('A4');
  });

  it('handles sharps', () => {
    expect(noteName(61)).toBe('C#4');
  });

  it('one octave up increments the octave number', () => {
    expect(noteName(72)).toBe('C5');
  });

  it('one octave down decrements the octave number', () => {
    expect(noteName(48)).toBe('C3');
  });

  it('handles low notes correctly (octave can go negative)', () => {
    expect(noteName(0)).toBe('C-1');
  });
});
