import crypto from 'node:crypto';

/**
 * ====================================================================
 * HISBO CONTROL: Google Analytics 4 Data API Client (Read-Only)
 * ====================================================================
 *
 * Requirements:
 * 1. Zero dependencies: Uses standard node:crypto and native fetch.
 * 2. Scoped to read-only: https://www.googleapis.com/auth/analytics.readonly.
 * 3. Never prints or exposes private keys.
 * 4. Never fabricates or invents visitor telemetry.
 * 5. Returns real metric values or explicit configuration status.
 * ====================================================================
 */

export interface GA4TelemetryMetrics {
  activeUsers28d: number;
  totalSessions: number;
  bounceRate: number;
}

export interface GA4TelemetryResult {
  configured: boolean;
  measurementId: string;
  message: string;
  telemetry: GA4TelemetryMetrics | null;
  error?: string;
}

/**
 * Exchange a Google Cloud Service Account JWT assertion for a short-lived OAuth2 access token.
 */
async function getGoogleServiceAccountAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${b64(header)}.${b64(claims)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  sign.end();

  // Handle both literal newlines and escaped \n sequences commonly used in environment variables
  const normalizedKey = privateKey.replace(/\\n/g, '\n').trim();
  const signature = sign.sign(normalizedKey, 'base64url');

  const assertion = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    let parsedErr = 'OAuth2 token exchange failed';
    try {
      const errJson = JSON.parse(errText);
      parsedErr = errJson.error_description || errJson.error || errText;
    } catch {
      parsedErr = errText;
    }
    throw new Error(`Google Service Account Authentication Failed: ${parsedErr}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * Fetch live traffic and visitor telemetry from the Google Analytics 4 Data API.
 */
export async function fetchLiveGA4Telemetry(): Promise<GA4TelemetryResult> {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA4_PRIVATE_KEY?.trim();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-LCMEK1R5HY';

  if (!propertyId || !clientEmail || !privateKey) {
    const missing: string[] = [];
    if (!propertyId) missing.push('GA4_PROPERTY_ID');
    if (!clientEmail) missing.push('GA4_CLIENT_EMAIL');
    if (!privateKey) missing.push('GA4_PRIVATE_KEY');

    return {
      configured: false,
      measurementId,
      message: `Google Analytics 4 Data API is not yet configured. Missing environment variables: ${missing.join(', ')}. Web client events continue streaming to tag ${measurementId}.`,
      telemetry: null,
    };
  }

  try {
    const accessToken = await getGoogleServiceAccountAccessToken(clientEmail, privateKey);

    // Call Google Analytics Data API (v1beta) runReport
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
    const reportRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
      }),
    });

    if (!reportRes.ok) {
      const errText = await reportRes.text();
      let msg = 'Google Analytics Data API request failed';
      try {
        const json = JSON.parse(errText);
        msg = json.error?.message || errText;
      } catch {
        msg = errText;
      }
      return {
        configured: false,
        measurementId,
        message: `GA4 Data API error: ${msg}`,
        telemetry: null,
        error: msg,
      };
    }

    const data = await reportRes.json();
    const metricValues = data.rows?.[0]?.metricValues || [];

    const activeUsers28d = metricValues[0]?.value ? parseInt(metricValues[0].value, 10) : 0;
    const totalSessions = metricValues[1]?.value ? parseInt(metricValues[1].value, 10) : 0;
    const bounceRateRaw = metricValues[2]?.value ? parseFloat(metricValues[2].value) : 0;
    const bounceRate = Math.round(bounceRateRaw * 100 * 10) / 10; // Convert ratio to percentage rounded to 1 decimal

    return {
      configured: true,
      measurementId,
      message: 'Live Google Analytics 4 telemetry retrieved successfully.',
      telemetry: {
        activeUsers28d,
        totalSessions,
        bounceRate,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown GA4 telemetry error';
    return {
      configured: false,
      measurementId,
      message: `Failed to connect to GA4 Data API: ${msg}`,
      telemetry: null,
      error: msg,
    };
  }
}

