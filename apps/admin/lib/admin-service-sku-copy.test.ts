import { describe, expect, it } from 'vitest';
import { linesToList, listToLines } from './admin-service-sku-copy';

describe('linesToList / listToLines', () => {
  it('parses non-empty lines and round-trips', () => {
    expect(linesToList('  Dust surfaces\n\nVacuum floors\n ')).toEqual([
      'Dust surfaces',
      'Vacuum floors',
    ]);
    expect(listToLines(['Dust surfaces', 'Vacuum floors'])).toBe('Dust surfaces\nVacuum floors');
  });

  it('handles empty input', () => {
    expect(linesToList(null)).toEqual([]);
    expect(linesToList('')).toEqual([]);
    expect(listToLines([])).toBe('');
  });
});
