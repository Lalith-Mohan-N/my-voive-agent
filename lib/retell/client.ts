// ============================================================
// VitaVoice — Retell AI SDK Client Wrapper
// ============================================================

import Retell from 'retell-sdk';

let retellClient: Retell | null = null;

/**
 * Returns a singleton Retell SDK client.
 */
export function getRetellClient(): Retell {
  if (retellClient) return retellClient;

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error('Missing RETELL_API_KEY environment variable.');
  }

  retellClient = new Retell({ apiKey });
  return retellClient;
}

/**
 * Verify a Retell webhook signature.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  apiKey?: string
): boolean {
  try {
    const key = apiKey || process.env.RETELL_API_KEY;
    if (!key) return false;
    return Retell.verify(rawBody, key, signature);
  } catch {
    return false;
  }
}
