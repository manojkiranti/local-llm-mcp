import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export type ServiceSession = {
  userEmail: string | null;
  [key: string]: unknown;
};

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function tokenMatches(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createAuthenticate(serviceToken: string) {
  return async (request: IncomingMessage): Promise<ServiceSession> => {
    const authorization = firstHeader(request.headers.authorization) ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';

    if (!serviceToken || !token || !tokenMatches(token, serviceToken)) {
      throw new Response(null, { status: 401, statusText: 'Unauthorized' });
    }

    return { userEmail: firstHeader(request.headers['x-user-email']) ?? null };
  };
}
