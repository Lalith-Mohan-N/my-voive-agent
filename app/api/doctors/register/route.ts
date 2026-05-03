// ============================================================
// VitaVoice — Doctor Registration API Route
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { randomBytes, pbkdf2Sync } from 'crypto';

export interface DoctorRegisterRequest {
  full_name: string;
  email: string;
  phone?: string;
  specialization: string;
  hospital_name?: string;
  license_number: string;
  password: string;
}

export interface DoctorRegisterResponse {
  success: boolean;
  doctor?: {
    id: string;
    email: string;
    full_name: string;
  };
  error?: string;
}

/**
 * Hash password using PBKDF2
 */
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * POST /api/doctors/register
 * Register a new doctor account.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: DoctorRegisterRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.full_name || !body.specialization || !body.license_number || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (body.password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if email already exists
    const {
      data: existingDoctor,
      error: existingError,
    } = await (supabase.from('doctors') as any)
      .select('id')
      .eq('email', body.email)
      .maybeSingle() as any;

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Doctor lookup error:', existingError);
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${existingError.message}`,
        },
        { status: 500 }
      );
    }

    if (existingDoctor) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const { hash, salt } = hashPassword(body.password);
    const passwordHash = `${salt}:${hash}`;

    // Create doctor record
    const { data: doctor, error } = await (supabase.from('doctors') as any)
      .insert({
        email: body.email,
        full_name: body.full_name,
        phone: body.phone || null,
        specialization: body.specialization,
        hospital_name: body.hospital_name || null,
        license_number: body.license_number,
        password_hash: passwordHash,
        is_online: true,
        last_seen_at: new Date().toISOString(),
      })
      .select('id, email, full_name')
      .single() as any;

    if (error) {
      console.error('Doctor registration insert error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create doctor account: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      doctor: {
        id: doctor.id,
        email: doctor.email,
        full_name: doctor.full_name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/doctors/register
 * Health check.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'VitaVoice Doctor Registration',
    timestamp: new Date().toISOString(),
  });
}
