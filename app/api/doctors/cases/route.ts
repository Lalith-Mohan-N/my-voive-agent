// ============================================================
// VitaVoice — Doctor Cases API Route
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export interface CasesResponse {
  success: boolean;
  cases?: unknown[];
  error?: string;
}

export interface TakeCaseRequest {
  case_id: string;
  action: 'take' | 'release';
}

export interface TakeCaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * GET /api/doctors/cases
 * List all active emergency cases or get single case detail.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('case_id');

    const supabase = createServerClient();

    // If case_id provided, fetch single case with full details
    if (caseId) {
      const { data: caseData, error } = await (supabase.from('emergency_cases') as any)
        .select(`
          id,
          case_number,
          patient_name,
          chief_complaint,
          urgency_level,
          location,
          device_latitude,
          device_longitude,
          status,
          created_at,
          conversation_memory (role, content, created_at)
        `)
        .eq('id', caseId)
        .single();

      if (error || !caseData) {
        return NextResponse.json(
          { success: false, error: 'Case not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, case: caseData });
    }

    // Otherwise, list all active cases
    const { data: cases, error } = await (supabase.from('emergency_cases') as any)
      .select(`
        id,
        case_number,
        patient_name,
        chief_complaint,
        urgency_level,
        location,
        device_latitude,
        device_longitude,
        created_at,
        assigned_doctor_id,
        agent_active,
        noise_level,
        doctors:assigned_doctor_id (full_name, specialization)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch cases:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch cases' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cases: cases || [],
    });
  } catch (error) {
    console.error('Cases fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/doctors/cases
 * Take or release a case assignment.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: TakeCaseRequest = await request.json();

    if (!body.case_id || !body.action) {
      return NextResponse.json(
        { success: false, error: 'Missing case_id or action' },
        { status: 400 }
      );
    }

    // Get doctor ID from authorization header (in production, validate JWT)
    const authHeader = request.headers.get('authorization');
    let doctorId: string | null = null;

    // Simple auth check - in production, use proper JWT validation
    if (authHeader?.startsWith('Bearer ')) {
      // For demo, extract doctor ID from a simple header
      doctorId = request.headers.get('x-doctor-id');
    }

    // If no auth header, try to get from request body for demo
    if (!doctorId) {
      doctorId = (body as any).doctor_id;
    }

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    if (body.action === 'take') {
      // Check if case is already assigned
      const { data: existingCase } = await (supabase.from('emergency_cases') as any)
        .select('assigned_doctor_id')
        .eq('id', body.case_id)
        .single() as any;

      if (existingCase?.assigned_doctor_id && existingCase.assigned_doctor_id !== doctorId) {
        return NextResponse.json(
          { success: false, error: 'Case already assigned to another doctor' },
          { status: 409 }
        );
      }

      // Assign case to doctor and set agent_active to false
      const { error: updateError } = await (supabase.from('emergency_cases') as any)
        .update({
          assigned_doctor_id: doctorId,
          agent_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.case_id);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: 'Failed to assign case' },
          { status: 500 }
        );
      }

      // Create assignment record
      await (supabase.from('case_assignments') as any).insert({
        case_id: body.case_id,
        doctor_id: doctorId,
        status: 'active',
        accepted_at: new Date().toISOString(),
      });

      // Log to timeline
      await (supabase.from('case_timeline') as any).insert({
        case_id: body.case_id,
        event_type: 'status_change',
        speaker: 'system',
        content: 'Doctor has taken over the case. AI agent assistance ended.',
      });

      return NextResponse.json({
        success: true,
        message: 'Case assigned successfully',
      });
    }

    if (body.action === 'release') {
      // Release case assignment
      const { error: updateError } = await (supabase.from('emergency_cases') as any)
        .update({
          assigned_doctor_id: null,
          agent_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.case_id)
        .eq('assigned_doctor_id', doctorId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: 'Failed to release case' },
          { status: 500 }
        );
      }

      // Update assignment record
      await (supabase.from('case_assignments') as any)
        .update({
          status: 'released',
          completed_at: new Date().toISOString(),
        })
        .eq('case_id', body.case_id)
        .eq('doctor_id', doctorId)
        .eq('status', 'active');

      // Log to timeline
      await (supabase.from('case_timeline') as any).insert({
        case_id: body.case_id,
        event_type: 'status_change',
        speaker: 'system',
        content: 'Doctor has released the case. AI agent assistance resumed.',
      });

      return NextResponse.json({
        success: true,
        message: 'Case released successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Case assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
