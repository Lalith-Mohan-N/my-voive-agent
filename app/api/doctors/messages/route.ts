// ============================================================
// VitaVoice — Doctor Messages API Route
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { case_id, content } = body;

    if (!case_id || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing case_id or content' },
        { status: 400 }
      );
    }

    // Get doctor from auth header (simplified - in production use JWT)
    const authHeader = request.headers.get('authorization');
    const doctorId = request.headers.get('x-doctor-id');

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Insert message
    const { error } = await (supabase.from('doctor_messages') as any).insert({
      case_id,
      doctor_id: doctorId,
      sender_type: 'doctor',
      content,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to send message:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Also log to case timeline
    await (supabase.from('case_timeline') as any).insert({
      case_id,
      event_type: 'message',
      speaker: 'doctor',
      content,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('case_id');

    if (!caseId) {
      return NextResponse.json(
        { success: false, error: 'Missing case_id' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: messages, error } = await (supabase.from('doctor_messages') as any)
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (error) {
    console.error('Message fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
