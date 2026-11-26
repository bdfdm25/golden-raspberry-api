const PRODUCER_SEPARATORS = /,|\band\b|&/i;

/**
 * Splits a raw producers cell into individual producer names.
 * Handles the separators found in the dataset: ",", " and " and "&".
 */
export function parseProducers(rawProducers: string): string[] {
  return rawProducers
    .split(PRODUCER_SEPARATORS)
    .map((producer) => producer.trim())
    .filter((producer) => producer.length > 0);
}
