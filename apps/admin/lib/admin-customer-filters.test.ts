import { describe, expect, it } from 'vitest';
import { readCustomerListFilters } from './admin-customer-filters';

describe('readCustomerListFilters', () => {
  it('parses q, city, and postcode', () => {
    expect(
      readCustomerListFilters({
        q: '  Alex ',
        city: 'London',
        postcode: 'sw1',
      }),
    ).toEqual({ q: 'Alex', city: 'London', postcode: 'SW1' });
  });

  it('defaults missing params to null', () => {
    expect(readCustomerListFilters({})).toEqual({
      q: null,
      city: null,
      postcode: null,
    });
  });
});
