import '@testing-library/jest-dom';

// Polyfill web APIs for Next.js server component tests in jsdom
if (typeof Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;
    body: string | null;
    headers: Headers;
    constructor(input: string | Request, init?: RequestInit) {
      if (typeof input === 'string') {
        this.url = input;
        this.method = init?.method ?? 'GET';
        this.body = init?.body ? String(init.body) : null;
        this.headers = new Headers(init?.headers);
      } else {
        this.url = input.url;
        this.method = input.method;
        this.body = input.body;
        this.headers = input.headers;
      }
    }
    async text() {
      return this.body ?? '';
    }
    async json() {
      return JSON.parse(this.body ?? '{}');
    }
  } as any;
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    status: number;
    body: string;
    headers: Headers;
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body ? String(body) : '';
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }
    async json() {
      return JSON.parse(this.body);
    }
    async text() {
      return this.body;
    }
    static json(data: any, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { ...init?.headers, 'content-type': 'application/json' },
      });
    }
  } as any;
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    private map = new Map<string, string>();
    constructor(init?: Record<string, string> | Headers | string[][] | undefined) {
      if (init && typeof init === 'object') {
        if (Array.isArray(init)) {
          init.forEach(([k, v]) => this.map.set(k.toLowerCase(), String(v)));
        } else if (init instanceof Map) {
          init.forEach((v, k) => this.map.set(k.toLowerCase(), String(v)));
        } else {
          Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), String(v)));
        }
      }
    }
    get(name: string) {
      return this.map.get(name.toLowerCase()) ?? null;
    }
    set(name: string, value: string) {
      this.map.set(name.toLowerCase(), String(value));
    }
    has(name: string) {
      return this.map.has(name.toLowerCase());
    }
    forEach(callback: (value: string, key: string, parent: Headers) => void) {
      this.map.forEach((value, key) => callback(value, key, this));
    }
    entries() {
      return this.map.entries();
    }
    [Symbol.iterator]() {
      return this.map.entries();
    }
  } as any;
}

if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}
