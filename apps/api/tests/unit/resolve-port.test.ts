import { describe, expect, it } from 'vitest';
import { resolvePort } from '../../src/server.js';

describe('resolvePort', () => {
  it('uses the port assigned by the OS', () => {
    expect(resolvePort({ address: '127.0.0.1', family: 'IPv4', port: 54321 }, 3000)).toBe(54321);
  });

  it.each([null, '/tmp/api.sock'])('falls back to the configured port for %s', (address) => {
    expect(resolvePort(address, 3000)).toBe(3000);
  });
});
