// ============================================================
// VitaVoice — Retell AI Webhook API Route
// ============================================================

import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/retell/client';
import { handleWebhookEvent } from '@/lib/retell/webhook-handler';
import type { RetellWebhookEvent } from '@/lib/retell/types';

/**
 * POST /api/retell/webhook
 * Receives and processes Retell AI webhook events.
 */
export async function POST(request: Request) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-retell-signature');

    // 2. Verify webhook signature (skip in development if no signature)
    if (signature) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // 3. Parse the event payload
    let event: RetellWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // 4. Validate event structure
    if (!event.event || !event.call) {
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }

    // 5. Process the event
    await handleWebhookEvent(event);

    // 6. Return 200 immediately
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Health check */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'VitaVoice Retell Webhook',
    timestamp: new Date().toISOString(),
  });
}
