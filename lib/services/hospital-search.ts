// ============================================================
// VitaVoice — Real Hospital Search via Google Places API
// ============================================================
// Provides live hospital data based on GPS coordinates.
// Falls back to seed data if API fails or rate limited.

import { createServerClient } from '@/lib/supabase/server';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  emergency_capacity: 'available' | 'limited' | 'full' | 'unknown';
  specialties: string[];
  latitude: number;
  longitude: number;
  distance_km?: number;
  distance_text?: string;
  duration_text?: string;
  rating?: number;
  open_now?: boolean;
  place_id?: string;
  maps_url?: string;
}

export interface HospitalSearchResult {
  success: boolean;
  hospitals: Hospital[];
  source: 'google_places' | 'seed_data' | 'error';
  error?: string;
  location_query?: string;
}

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  opening_hours?: {
    open_now: boolean;
  };
  formatted_phone_number?: string;
  types?: string[];
}

// Cache for 5 minutes to avoid rate limits
const cache = new Map<string, { data: Hospital[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Search for real hospitals near the given GPS coordinates using Google Places API.
 * Falls back to seed data from Supabase if the API fails.
 */
export async function searchNearbyHospitals(
  latitude: number,
  longitude: number,
  radiusMeters: number = 10000, // 10km default
  requiredSpecialty?: string
): Promise<HospitalSearchResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // Check cache first
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${radiusMeters}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Filter by specialty if needed
    let hospitals = cached.data;
    if (requiredSpecialty) {
      hospitals = hospitals.filter((h) =>
        h.specialties.some((s) =>
          s.toLowerCase().includes(requiredSpecialty.toLowerCase())
        )
      );
    }
    return {
      success: true,
      hospitals: hospitals.slice(0, 2),
      source: 'google_places',
    };
  }

  // If no API key, fall back to seed data immediately
  if (!apiKey || apiKey === 'your_google_places_api_key') {
    console.log('No Google Places API key, using seed data');
    return getSeedHospitals(latitude, longitude, requiredSpecialty);
  }

  try {
    // Call Google Places API Nearby Search
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${latitude},${longitude}`);
    url.searchParams.append('radius', radiusMeters.toString());
    url.searchParams.append('type', 'hospital');
    url.searchParams.append('key', apiKey);
    // Open now if available
    url.searchParams.append('opennow', 'true');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('Google Places API status:', data.status);
      if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST') {
        return getSeedHospitals(latitude, longitude, requiredSpecialty);
      }
    }

    if (!data.results || data.results.length === 0) {
      console.log('No hospitals found via Google Places, using seed data');
      return getSeedHospitals(latitude, longitude, requiredSpecialty);
    }

    // Get detailed info for each place (phone numbers, etc)
    const hospitals: Hospital[] = await Promise.all(
      data.results.slice(0, 5).map(async (place: GooglePlace) => {
        const details = await getPlaceDetails(place.place_id, apiKey);
        const distance = calculateDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        return {
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          city: extractCity(place.vicinity),
          phone: details.formatted_phone_number || details.international_phone_number,
          emergency_capacity: estimateCapacity(place),
          specialties: inferSpecialties(place.types || [], place.name),
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          distance_km: distance,
          distance_text: formatDistance(distance),
          rating: place.rating,
          open_now: place.opening_hours?.open_now ?? null,
          place_id: place.place_id,
          maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        };
      })
    );

    // Sort by distance
    hospitals.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

    // Filter out hospitals that are unreasonably far (> 20km) to avoid 2-hour drives
    hospitals = hospitals.filter(h => (h.distance_km || 0) <= 20);

    // Cache the results
    cache.set(cacheKey, { data: hospitals, timestamp: Date.now() });

    // Filter by specialty if needed
    let filteredHospitals = hospitals;
    if (requiredSpecialty) {
      filteredHospitals = hospitals.filter((h) =>
        h.specialties.some((s) =>
          s.toLowerCase().includes(requiredSpecialty.toLowerCase())
        )
      );
    }

    return {
      success: true,
      hospitals: filteredHospitals.slice(0, 3),
      source: 'google_places',
      location_query: `${latitude},${longitude}`,
    };
  } catch (error) {
    console.error('Hospital search error:', error);
    return getSeedHospitals(latitude, longitude, requiredSpecialty);
  }
}

/**
 * Get place details from Google Places API
 */
async function getPlaceDetails(placeId: string, apiKey: string): Promise<any> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'formatted_phone_number,international_phone_number,opening_hours,website');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return {};

    const data = await response.json();
    return data.result || {};
  } catch {
    return {};
  }
}

/**
 * Fallback to seed hospitals from Supabase database
 */
async function getSeedHospitals(
  latitude: number,
  longitude: number,
  requiredSpecialty?: string
): Promise<HospitalSearchResult> {
  try {
    const supabase = createServerClient();
    let query = (supabase.from('hospitals') as any)
      .select('*')
      .neq('emergency_capacity', 'full');

    if (requiredSpecialty) {
      query = query.contains('specialties', [requiredSpecialty]);
    }

    const { data: hospitals, error } = await query.limit(5);

    if (error || !hospitals || hospitals.length === 0) {
      return {
        success: false,
        hospitals: [],
        source: 'error',
        error: 'No hospitals found in database.',
      };
    }

    // Calculate distances and sort
    const hospitalsWithDistance = hospitals.map((h: any) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        h.latitude,
        h.longitude
      );
      return {
        ...h,
        distance_km: distance,
        distance_text: formatDistance(distance),
      };
    });

    hospitalsWithDistance.sort((a: Hospital, b: Hospital) =>
      (a.distance_km || 0) - (b.distance_km || 0)
    );

    // Filter out hospitals that are too far (> 20km)
    const validHospitals = hospitalsWithDistance.filter((h: Hospital) => (h.distance_km || 0) <= 20);

    if (validHospitals.length === 0) {
      return {
        success: false,
        hospitals: [],
        source: 'error',
        error: 'No hospitals found within a reasonable distance (20km).',
      };
    }

    return {
      success: true,
      hospitals: validHospitals.slice(0, 2),
      source: 'seed_data',
      location_query: `${latitude},${longitude}`,
    };
  } catch (error) {
    return {
      success: false,
      hospitals: [],
      source: 'error',
      error: error instanceof Error ? error.message : 'Database error',
    };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Extract city from address string
 */
function extractCity(vicinity: string): string {
  const parts = vicinity.split(',');
  return parts[parts.length - 1]?.trim() || 'Unknown';
}

/**
 * Estimate emergency capacity based on place data
 */
function estimateCapacity(place: GooglePlace): Hospital['emergency_capacity'] {
  // If rating is high and place is big, assume available
  if (place.rating && place.rating >= 4.0) {
    return 'available';
  }
  if (place.rating && place.rating >= 3.0) {
    return 'limited';
  }
  return 'unknown';
}

/**
 * Infer specialties from place types and name
 */
function inferSpecialties(types: string[], name: string): string[] {
  const specialties: string[] = ['emergency'];
  const nameLower = name.toLowerCase();

  if (nameLower.includes('children') || nameLower.includes('pediatric') || types.includes('hospital') && nameLower.includes('child')) {
    specialties.push('pediatrics');
  }
  if (nameLower.includes('heart') || nameLower.includes('cardiac') || nameLower.includes('cardiology')) {
    specialties.push('cardiology');
  }
  if (nameLower.includes('brain') || nameLower.includes('neuro') || nameLower.includes('neurology')) {
    specialties.push('neurology');
  }
  if (nameLower.includes('trauma') || nameLower.includes('accident')) {
    specialties.push('trauma');
  }
  if (nameLower.includes('burn')) {
    specialties.push('burns');
  }
  if (nameLower.includes('ortho') || nameLower.includes('bone')) {
    specialties.push('orthopedics');
  }
  if (nameLower.includes('maternity') || nameLower.includes('women')) {
    specialties.push('maternity');
  }
  if (nameLower.includes('cancer') || nameLower.includes('oncology')) {
    specialties.push('oncology');
  }

  return specialties;
}

/**
 * Geocode a location string to coordinates
 */
export async function geocodeLocation(locationString: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.append('address', locationString);
    url.searchParams.append('region', 'in'); // Prefer Indian results
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.[0]) return null;

    return data.results[0].geometry.location;
  } catch {
    return null;
  }
}
