/**
 * Integration test: Webhook endpoint → DB write flow
 * Tests the full POST /api/retell/webhook pipeline
 */

import { POST, GET } from '@/app/api/retell/webhook/route';

// Mock Retell SDK
jest.mock('retell-sdk', () => ({
  __esModule: true,
  default: class MockRetell {
    constructor() {}
    static verify(_body: string, _key: string, sig: string) {
      return sig === 'valid-sig';
    }
  },
}));

// Mock Supabase server client
const mockInsert = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { id: 'case-123' },
      error: null,
    }),
  }),
});

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      insert: mockInsert,
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'case-123' },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }),
}));

describe('Webhook Endpoint Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      RETELL_API_KEY: 'test-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('GET returns health check', async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('VitaVoice Retell Webhook');
  });

  it('POST processes valid call_started event', async () => {
    const payload = JSON.stringify({
      event: 'call_started',
      call: {
        call_id: 'test-call-1',
        agent_id: 'agent-1',
        call_status: 'registered',
      },
    });

    const request = new Request('http://localhost:3000/api/retell/webhook', {
      method: 'POST',
      body: payload,
      headers: { 'x-retell-signature': 'valid-sig' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  it('POST rejects invalid signature in production', async () => {
    process.env.NODE_ENV = 'production';

    const payload = JSON.stringify({
      event: 'call_started',
      call: { call_id: 'test', agent_id: 'test', call_status: 'registered' },
    });

    const request = new Request('http://localhost:3000/api/retell/webhook', {
      method: 'POST',
      body: payload,
      headers: { 'x-retell-signature': 'invalid-sig' },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('POST rejects missing signature in production', async () => {
    process.env.NODE_ENV = 'production';

    const payload = JSON.stringify({
      event: 'call_started',
      call: { call_id: 'test', agent_id: 'test', call_status: 'registered' },
    });

    const request = new Request('http://localhost:3000/api/retell/webhook', {
      method: 'POST',
      body: payload,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('POST rejects invalid JSON', async () => {
    const request = new Request('http://localhost:3000/api/retell/webhook', {
      method: 'POST',
      body: 'not-json{{{',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('POST rejects invalid event structure', async () => {
    const payload = JSON.stringify({ foo: 'bar' });

    const request = new Request('http://localhost:3000/api/retell/webhook', {
      method: 'POST',
      body: payload,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
