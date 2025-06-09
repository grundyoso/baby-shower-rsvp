
import { beforeEach, afterEach, describe, expect, it, spyOn } from 'bun:test';
import { verifyRecaptcha } from '../handlers/verify_recaptcha';

// Mock console.error to avoid spam in test output
const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

describe('verifyRecaptcha', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
    consoleSpy.mockClear();
    
    // Set up default environment variable
    process.env['RECAPTCHA_SECRET_KEY'] = 'test-secret-key';
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    
    // Clean up environment variable
    delete process.env['RECAPTCHA_SECRET_KEY'];
  });

  it('should return true for valid reCAPTCHA token', async () => {
    // Mock successful reCAPTCHA response
    const mockFetch = Object.assign(
      async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    const result = await verifyRecaptcha('valid-token');

    expect(result).toBe(true);
  });

  it('should return false for invalid reCAPTCHA token', async () => {
    // Mock failed reCAPTCHA response
    const mockFetch = Object.assign(
      async () => new Response(JSON.stringify({ success: false }), { status: 200 }),
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    const result = await verifyRecaptcha('invalid-token');

    expect(result).toBe(false);
  });

  it('should return false when secret key is not configured', async () => {
    // Remove secret key from environment
    delete process.env['RECAPTCHA_SECRET_KEY'];

    const result = await verifyRecaptcha('some-token');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('reCAPTCHA secret key not configured');
  });

  it('should return false for empty token', async () => {
    const result = await verifyRecaptcha('');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('reCAPTCHA token is empty or missing');
  });

  it('should return false for whitespace-only token', async () => {
    const result = await verifyRecaptcha('   ');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('reCAPTCHA token is empty or missing');
  });

  it('should return false when fetch request fails', async () => {
    // Mock HTTP error response
    const mockFetch = Object.assign(
      async () => new Response('Bad Request', { status: 400 }),
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    const result = await verifyRecaptcha('some-token');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('reCAPTCHA verification request failed:', 400);
  });

  it('should return false when fetch throws an exception', async () => {
    // Mock network error
    const networkError = new Error('Network error');
    const mockFetch = Object.assign(
      async () => { throw networkError; },
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    const result = await verifyRecaptcha('some-token');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('reCAPTCHA verification failed:', networkError);
  });

  it('should return false when JSON parsing fails', async () => {
    // Mock response with invalid JSON
    const mockFetch = Object.assign(
      async () => new Response('invalid json', { status: 200 }),
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    const result = await verifyRecaptcha('some-token');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('reCAPTCHA verification failed:', expect.any(Error));
  });

  it('should handle response with missing success field', async () => {
    // Mock response without success field
    const mockFetch = Object.assign(
      async () => new Response(JSON.stringify({}), { status: 200 }),
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    const result = await verifyRecaptcha('some-token');

    expect(result).toBe(false);
  });

  it('should handle response with success field as string', async () => {
    // Mock response with success as string instead of boolean
    const mockFetch = Object.assign(
      async () => new Response(JSON.stringify({ success: 'true' }), { status: 200 }),
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    const result = await verifyRecaptcha('some-token');

    // Should return false because success is not strictly true
    expect(result).toBe(false);
  });

  it('should send correct request parameters', async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    const mockFetch = Object.assign(
      async (url: string | Request | URL, init?: RequestInit) => {
        capturedUrl = url.toString();
        capturedInit = init;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      },
      { preconnect: () => {} }
    );
    global.fetch = mockFetch as any;

    await verifyRecaptcha('test-token');

    expect(capturedUrl).toBe('https://www.google.com/recaptcha/api/siteverify');
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.headers).toEqual({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    
    // Verify the body contains correct parameters
    const body = capturedInit?.body as URLSearchParams;
    expect(body.get('secret')).toBe('test-secret-key');
    expect(body.get('response')).toBe('test-token');
  });
});
