// ============================================================
// VitaVoice — Doctor Login API Route
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { pbkdf2Sync, randomBytes } from 'crypto';

export interface DoctorLoginRequest {
  email: string;
  password: string;
}

export interface DoctorLoginResponse {
  success: boolean;
  doctor?: {
    id: string;
    email: string;
    full_name: string;
    specialization: string;
    hospital_name?: string;
  };
  token?: string;
  error?: string;
}

/**
 * Verify password against stored hash
 */
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const computedHash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return computedHash === hash;
}

/**
 * Generate a simple session token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * POST /api/doctors/login
 * Authenticate doctor and create session.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: DoctorLoginRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find doctor by email
    const { data: doctor, error } = await (supabase.from('doctors') as any)
      .select('id, email, full_name, specialization, hospital_name, password_hash')
      .eq('email', body.email)
      .maybeSingle() as any;

    if (error || !doctor) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    if (!verifyPassword(body.password, doctor.password_hash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last seen
    await (supabase.from('doctors') as any)
      .update({
        is_online: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', doctor.id);

    // Generate session token
    const token = generateToken();

    return NextResponse.json({
      success: true,
      doctor: {
        id: doctor.id,
        email: doctor.email,
        full_name: doctor.full_name,
        specialization: doctor.specialization,
        hospital_name: doctor.hospital_name,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/doctors/login
 * Health check.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'VitaVoice Doctor Login',
    timestamp: new Date().toISOString(),
  });
}
