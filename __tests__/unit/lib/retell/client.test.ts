jest.mock('retell-sdk', () => {
  return {
    __esModule: true,
    default: class MockRetell {
      constructor(opts: { apiKey: string }) {
        // store for testing
      }
      static verify(body: string, apiKey: string, signature: string): boolean {
        return signature === 'valid-signature';
      }
    },
  };
});

import { verifyWebhookSignature } from '@/lib/retell/client';

describe('Retell Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, RETELL_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('verifyWebhookSignature', () => {
    it('returns true for valid signature', () => {
      const result = verifyWebhookSignature('body', 'valid-signature', 'test-key');
      expect(result).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const result = verifyWebhookSignature('body', 'bad-signature', 'test-key');
      expect(result).toBe(false);
    });

    it('returns false when no API key is available', () => {
      delete process.env.RETELL_API_KEY;
      const result = verifyWebhookSignature('body', 'valid-signature');
      expect(result).toBe(false);
    });
  });
});
