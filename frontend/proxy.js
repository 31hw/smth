import { NextResponse } from 'next/server';

const API_ORIGIN = process.env.REVIVAL_API_ORIGIN || 'http://127.0.0.1:3001';

function reject(message) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 403,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function requestOrigin(request) {
  // Next dev may build request.nextUrl from its 0.0.0.0 bind address. Use the
  // incoming host plus the reverse proxy's forwarded protocol when available.
  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!hostHeader) return request.nextUrl.origin;

  const host = hostHeader.split(',')[0].trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = forwardedProto || new URL(request.url).protocol.slice(0, -1);
  return new URL(`${protocol}://${host}`).origin;
}

/**
 * Restrict the preserved upstream API proxy page to the local revival API.
 * This prevents its broad hostname check from being used to proxy arbitrary
 * services or ports on the local machine.
 */
export function proxy(request) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return reject('Cross-site requests are not allowed.');

  if (origin) {
    try {
      if (new URL(origin).origin !== requestOrigin(request)) {
        return reject('Cross-origin requests are not allowed.');
      }
    } catch {
      return reject('Invalid request origin.');
    }
  }

  try {
    const target = new URL(request.nextUrl.searchParams.get('url') || '');
    const configuredOrigin = new URL(API_ORIGIN).origin;
    if (target.origin !== configuredOrigin || !target.pathname.startsWith('/api/')) {
      return reject('Proxy target is not an allowed local API URL.');
    }
  } catch {
    return reject('Invalid proxy target.');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/proxy'],
};
