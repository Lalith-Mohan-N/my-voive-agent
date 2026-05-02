'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EmergencyCase {
  id: string;
  case_number: string;
  patient_name: string;
  chief_complaint: string;
  urgency_level: 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW';
  location: string;
  device_latitude: number | null;
  device_longitude: number | null;
  created_at: string;
  assigned_doctor_id: string | null;
  agent_active: boolean;
}

interface DoctorData {
  doctorId: string;
  email: string;
  fullName: string;
  specialization: string;
}

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check authentication
    const auth = localStorage.getItem('doctorAuth');
    if (!auth) {
      router.push('/doctor/login');
      return;
    }

    try {
      const parsed = JSON.parse(auth);
      setDoctor(parsed);
    } catch {
      router.push('/doctor/login');
      return;
    }

    // Fetch available cases
    fetchCases();

    // Set up polling for live updates
    const interval = setInterval(fetchCases, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchCases = async () => {
    try {
      const response = await fetch('/api/doctors/cases');
      const data = await response.json();

      if (data.success) {
        setCases(data.cases);
      } else {
        setError(data.error || 'Failed to fetch cases');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeCase = async (caseId: string) => {
    try {
      const response = await fetch('/api/doctors/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, action: 'take' }),
      });

      const data = await response.json();

      if (data.success) {
        setActiveCaseId(caseId);
        fetchCases();
      } else {
        setError(data.error || 'Failed to take case');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('doctorAuth');
    router.push('/doctor/login');
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'URGENT':
        return 'bg-orange-500 text-white';
      case 'MEDIUM':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-green-500 text-white';
    }
  };

  const formatTimeElapsed = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-teal-500 rounded-full animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold text-white">
                VitaVoice
              </Link>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">Doctor Dashboard</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{doctor?.fullName}</p>
                <p className="text-xs text-slate-400">{doctor?.specialization}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Available Emergency Cases</h2>
          <p className="text-slate-400">
            Showing {cases.length} active case{cases.length !== 1 ? 's' : ''} matching your specialization
          </p>
        </div>

        {cases.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Active Cases</h3>
            <p className="text-slate-400">When emergency cases come in, they will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cases.map((emergencyCase) => (
              <div
                key={emergencyCase.id}
                className={`bg-slate-900 border rounded-xl p-6 transition-all ${
                  emergencyCase.assigned_doctor_id === doctor?.doctorId
                    ? 'border-teal-500/50 ring-1 ring-teal-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyColor(emergencyCase.urgency_level)}`}>
                        {emergencyCase.urgency_level}
                      </span>
                      <span className="text-slate-400 text-sm">
                        Case #{emergencyCase.case_number || emergencyCase.id.slice(0, 8)}
                      </span>
                      <span className="text-slate-500 text-sm">
                        {formatTimeElapsed(emergencyCase.created_at)} ago
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-white mb-1">
                      {emergencyCase.chief_complaint || 'Unknown Complaint'}
                    </h3>

                    <p className="text-slate-400 text-sm mb-3">
                      Patient: {emergencyCase.patient_name || 'Unknown'} | Location: {emergencyCase.location || 'Unknown'}
                    </p>

                    {emergencyCase.device_latitude && emergencyCase.device_longitude && (
                      <div className="flex items-center gap-2 text-sm text-teal-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Live GPS location available
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {emergencyCase.assigned_doctor_id === doctor?.doctorId ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 rounded-lg">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                        You are handling this case
                      </div>
                    ) : emergencyCase.assigned_doctor_id ? (
                      <span className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">
                        Assigned to another doctor
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTakeCase(emergencyCase.id)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors"
                      >
                        Take Case
                      </button>
                    )}
                  </div>
                </div>

                {emergencyCase.assigned_doctor_id === doctor?.doctorId && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Link
                        href={`/doctor/case/${emergencyCase.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Details
                      </Link>

                      <Link
                        href={`/doctor/case/${emergencyCase.id}/map`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.894-.447L15 7m0 13V7" />
                        </svg>
                        Live Map
                      </Link>

                      <Link
                        href={`/doctor/case/${emergencyCase.id}/chat`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Message Field
                      </Link>

                      <button
                        onClick={() => {/* Release case */}}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Release Case
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
