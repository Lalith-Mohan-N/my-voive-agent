import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { caseId, content, speaker } = await request.json();

    if (!caseId || !content || !speaker) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await (supabase.from('case_timeline') as any).insert({
      case_id: caseId,
      event_type: 'message',
      speaker: speaker,
      content: content,
    });

    if (error) {
      console.error('Error inserting message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Timeline message error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
