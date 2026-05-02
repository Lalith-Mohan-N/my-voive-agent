// ============================================================
// VitaVoice — Device Location Update API Route
// ============================================================
// Receives GPS coordinates from the device and updates the
// emergency case with real-time location data.
// Broadcasts updates via Supabase Realtime for live dashboard.

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export interface LocationUpdateRequest {
  case_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
}

export interface LocationUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * POST /api/location/update
 * Update emergency case with device GPS coordinates.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: LocationUpdateRequest = await request.json();

    // Validate required fields
    if (!body.case_id) {
      return NextResponse.json(
        { success: false, error: 'Missing case_id' },
        { status: 400 }
      );
    }

    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates. latitude and longitude must be numbers.' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (body.latitude < -90 || body.latitude > 90 || body.longitude < -180 || body.longitude > 180) {
      return NextResponse.json(
        { success: false, error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Update the emergency case with location data
    const updateData: Record<string, unknown> = {
      device_latitude: body.latitude,
      device_longitude: body.longitude,
      location_updated_at: new Date().toISOString(),
    };

    if (body.accuracy !== undefined) {
      updateData.location_accuracy = body.accuracy;
    }

    if (body.speed !== undefined && body.speed !== null) {
      updateData.device_speed = body.speed;
    }

    if (body.heading !== undefined && body.heading !== null) {
      updateData.device_heading = body.heading;
    }

    const { error } = await (supabase.from('emergency_cases') as any)
      .update(updateData)
      .eq('id', body.case_id);

    if (error) {
      console.error('Failed to update location:', error);
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // Log the location update in the timeline
    await (supabase.from('case_timeline') as any).insert({
      case_id: body.case_id,
      event_type: 'system',
      speaker: 'system',
      content: `Location updated: ${body.latitude.toFixed(6)}, ${body.longitude.toFixed(6)}`,
      metadata: {
        type: 'location_update',
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
        speed: body.speed,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
    });
  } catch (error) {
    console.error('Location update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/location/update
 * Health check for the location update endpoint.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'VitaVoice Location Update',
    timestamp: new Date().toISOString(),
  });
}
