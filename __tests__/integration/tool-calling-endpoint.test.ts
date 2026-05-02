/**
 * Integration test: Tool calling endpoint → handler execution → DB write
 * Tests POST /api/retell/tools pipeline
 */

import { POST, GET } from '@/app/api/retell/tools/route';

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

// Mock tool handlers
jest.mock('@/lib/retell/tool-handlers', () => ({
  handleToolCall: jest.fn().mockImplementation((toolName: string) => {
    if (toolName === 'log_vitals') {
      return Promise.resolve({
        success: true,
        data: { vital_id: 'vital-1', recorded: true },
      });
    }
    if (toolName === 'set_noise_level') {
      return Promise.resolve({
        success: true,
        data: { noise_level: 'high', adaptive_mode: true },
      });
    }
    return Promise.resolve({ success: false, error: 'Unknown tool' });
  }),
}));

describe('Tool Calling Endpoint Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      RETELL_API_KEY: 'test-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('GET returns health check with tool list', async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.tools).toContain('log_vitals');
    expect(body.tools).toContain('set_noise_level');
  });

  it('POST processes a valid tool call', async () => {
    const payload = JSON.stringify({
      call_id: 'call-1',
      tool_name: 'log_vitals',
      arguments: { case_id: 'case-1', heart_rate: 120 },
    });

    const request = new Request('http://localhost:3000/api/retell/tools', {
      method: 'POST',
      body: payload,
      headers: { 'x-retell-signature': 'valid-sig' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.vital_id).toBe('vital-1');
  });

  it('POST rejects invalid signature in production', async () => {
    process.env.NODE_ENV = 'production';

    const payload = JSON.stringify({
      call_id: 'call-1',
      tool_name: 'log_vitals',
      arguments: {},
    });

    const request = new Request('http://localhost:3000/api/retell/tools', {
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
      call_id: 'call-1',
      tool_name: 'log_vitals',
      arguments: {},
    });

    const request = new Request('http://localhost:3000/api/retell/tools', {
      method: 'POST',
      body: payload,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('POST rejects invalid JSON', async () => {
    const request = new Request('http://localhost:3000/api/retell/tools', {
      method: 'POST',
      body: 'not-json{{{',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('POST rejects missing tool_name', async () => {
    const payload = JSON.stringify({
      call_id: 'call-1',
      arguments: {},
    });

    const request = new Request('http://localhost:3000/api/retell/tools', {
      method: 'POST',
      body: payload,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
