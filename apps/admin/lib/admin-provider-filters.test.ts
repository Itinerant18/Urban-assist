import { describe, expect, it } from 'vitest';
import {
  providerIdsCoveringCityPostcodes,
  readProviderFilters,
} from './admin-provider-filters';

describe('readProviderFilters', () => {
  it('parses kyc, category, training, postcode, and city', () => {
    expect(
      readProviderFilters({
        kyc: 'approved',
        category: 'cat-elec',
        training: 'incomplete',
        postcode: 'sw1 a',
        city: ' London ',
      }),
    ).toEqual({
      kyc: 'approved',
      categoryId: 'cat-elec',
      training: 'incomplete',
      postcode: 'SW1A',
      city: 'London',
    });
  });

  it('ignores invalid enum values', () => {
    expect(
      readProviderFilters({
        kyc: 'maybe',
        training: 'all',
        category: '',
        postcode: '  ',
        city: '  ',
      }),
    ).toEqual({
      kyc: null,
      categoryId: null,
      training: null,
      postcode: null,
      city: null,
    });
  });
});

describe('providerIdsCoveringCityPostcodes', () => {
  it('matches area patterns that prefix city postcodes', () => {
    const ids = providerIdsCoveringCityPostcodes(
      [
        { provider_id: 'p1', postcode_pattern: 'N1' },
        { provider_id: 'p2', postcode_pattern: 'SW9' },
        { provider_id: 'p3', postcode_pattern: 'E1' },
      ],
      ['N1 0PQ', 'SW9 6DE'],
    );
    expect(ids).toEqual(new Set(['p1', 'p2']));
  });
});
