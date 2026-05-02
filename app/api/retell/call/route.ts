// ============================================================
// VitaVoice — Retell AI Web Call Creation API Route
// ============================================================

import { NextResponse } from 'next/server';
import { getRetellClient } from '@/lib/retell/client';

/**
 * POST /api/retell/call
 * Creates a new Retell web call and returns the access token + call_id.
 * The browser uses the access token to register the Retell Web SDK.
 */
export async function POST(request: Request) {
  try {
    // Early validation: check that API key and agent ID are real values
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey || apiKey === 'your_retell_api_key_here' || apiKey.startsWith('your_')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Retell API key is not configured. Please set a valid RETELL_API_KEY in your .env.local file.',
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { agent_id } = body;

    // Use provided agent_id or fallback to env var
    const resolvedAgentId = agent_id || process.env.RETELL_AGENT_ID;
    if (!resolvedAgentId || resolvedAgentId === 'your_retell_agent_id_here' || resolvedAgentId.startsWith('your_')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Retell Agent ID is not configured. Please set a valid RETELL_AGENT_ID in your .env.local file.',
        },
        { status: 400 }
      );
    }

    const retell = getRetellClient();

    // Create a web call (Retell handles the LLM, STT, TTS pipeline)
    const call = await retell.call.createWebCall({
      agent_id: resolvedAgentId,
      metadata: body.metadata || {},
    });

    return NextResponse.json(
      {
        success: true,
        access_token: call.access_token,
        call_id: call.call_id,
        agent_id: resolvedAgentId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Retell call creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create call';

    // Detect auth failures and provide friendly guidance
    if (message.includes('401') || message.toLowerCase().includes('invalid api key') || message.toLowerCase().includes('unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Retell API key. Please check your RETELL_API_KEY in .env.local and ensure it is a valid key from your Retell dashboard.',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/retell/call
 * Health check for the call creation endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'VitaVoice Retell Web Call Creation',
    timestamp: new Date().toISOString(),
  });
}
