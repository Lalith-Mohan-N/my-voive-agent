'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CaseDetail {
  id: string;
  case_number: string;
  patient_name: string;
  chief_complaint: string;
  location: string;
  device_latitude: number | null;
  device_longitude: number | null;
  urgency_level: string;
  status: string;
  created_at: string;
  conversation_memory: Array<{
    role: string;
    content: string;
    created_at: string;
  }>;
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('doctorAuth');
    if (!auth) {
      router.push('/doctor/login');
      return;
    }
    fetchCaseDetail();
  }, [params.id, router]);

  const fetchCaseDetail = async () => {
    try {
      const response = await fetch(`/api/doctors/cases?case_id=${params.id}`);
      const data = await response.json();
      if (data.success) {
        setCaseData(data.case);
      }
    } catch (error) {
      console.error('Failed to fetch case:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await fetch('/api/doctors/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: params.id, content: message }),
    });

    setMessage('');
    fetchCaseDetail();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading case details...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400">Case not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/doctor/dashboard" className="text-slate-400 hover:text-white">
              ← Back to Dashboard
            </Link>
            <span className="text-slate-600">|</span>
            <h1 className="text-white font-semibold">Case #{caseData.case_number}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            caseData.urgency_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
            caseData.urgency_level === 'URGENT' ? 'bg-orange-500/20 text-orange-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {caseData.urgency_level}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Case Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Patient Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="text-white">{caseData.patient_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Complaint:</span>
                <span className="text-white">{caseData.chief_complaint || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="text-white">{caseData.location || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-white capitalize">{caseData.status}</span>
              </div>
            </div>
          </div>

          {caseData.device_latitude && caseData.device_longitude && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">GPS Location</h2>
              <p className="text-slate-400 text-sm mb-3">
                Lat: {caseData.device_latitude.toFixed(6)}<br />
                Lng: {caseData.device_longitude.toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${caseData.device_latitude},${caseData.device_longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm"
              >
                Open in Google Maps
              </a>
            </div>
          )}
        </div>

        {/* Center & Right: Conversation */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">Conversation History</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {caseData.conversation_memory?.map((turn, index) => (
              <div
                key={index}
                className={`flex ${turn.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    turn.role === 'user'
                      ? 'bg-slate-800 text-white'
                      : 'bg-teal-600/20 text-teal-100 border border-teal-600/30'
                  }`}
                >
                  <p className="text-sm">{turn.content}</p>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {new Date(turn.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message to the field..."
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
