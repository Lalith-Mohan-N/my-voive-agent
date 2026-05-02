// ============================================================
// VitaVoice — Retell AI Tool Execution API Route
// ============================================================

import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/retell/client';
import { handleToolCall } from '@/lib/retell/tool-handlers';
import type { RetellToolCallRequest, RetellToolCallResult } from '@/lib/retell/types';

/**
 * POST /api/retell/tools
 * Receives tool call requests from Retell AI mid-conversation.
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
        console.error('Invalid tool call signature');
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 401 }
      );
    }

    // 3. Parse the tool call payload
    let payload: RetellToolCallRequest;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // 4. Validate required fields
    if (!payload.tool_name || !payload.call_id) {
      return NextResponse.json(
        { success: false, error: 'Missing tool_name or call_id' },
        { status: 400 }
      );
    }

    // 5. Execute the tool handler
    const result: RetellToolCallResult = await handleToolCall(
      payload.tool_name,
      payload.arguments || {},
      payload.call_id
    );

    // 6. Return result to Retell (must be fast — under 1s)
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Tool execution endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/retell/tools
 * Health check for the tool endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'VitaVoice Retell Tool Execution',
    tools: [
      'create_emergency_case',
      'log_vitals',
      'get_patient_history',
      'find_nearest_hospital',
      'notify_supervisor',
      'set_noise_level',
    ],
    timestamp: new Date().toISOString(),
  });
}
