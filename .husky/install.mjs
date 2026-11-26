// Husky's documented installer guard: a production or CI install has no hooks to set up,
// and `npm ci --omit=dev` would otherwise fail on the missing husky binary.
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0);
}

const husky = (await import('husky')).default;
husky();
