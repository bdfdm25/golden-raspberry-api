import { describe, expect, it } from 'vitest';
import { normalizeProducerName } from '../../src/producers/producer-identity.js';

describe('normalizeProducerName', () => {
  it.each([
    ['José Silva', 'jose silva'],
    ['JOSÉ SILVA', 'jose silva'],
    ['Jose  Silva', 'jose silva'],
    ['  Joel Silver  ', 'joel silver'],
    ['Lorenzo di Bonaventura', 'lorenzo di bonaventura'],
    ['Lorenzo Di Bonaventura', 'lorenzo di bonaventura'],
  ])('maps %s to %s', (raw, expected) => {
    expect(normalizeProducerName(raw)).toBe(expected);
  });

  it('keeps punctuation so initials stay distinct from full names', () => {
    expect(normalizeProducerName('J. Smith')).not.toBe(normalizeProducerName('J Smith'));
  });

  it('keeps different producers apart', () => {
    expect(normalizeProducerName('Joel Silver')).not.toBe(normalizeProducerName('Joe Silver'));
  });
});
