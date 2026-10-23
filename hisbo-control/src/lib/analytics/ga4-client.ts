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
 * 6. Robust OpenSSL 3.x key normalization across Vercel and local environments.
 * ====================================================================
 */

export interface GA4TelemetryMetrics {
  activeUsers28d: number;
  totalSessions: number;
  bounceRate: number;
}

export interface GA4TelemetryResult {
  success: boolean;
  configured: boolean;
  requiresConfiguration?: boolean;
  measurementId: string;
  message: string;
  telemetry: GA4TelemetryMetrics | null;
  error?: string;
}

/**
 * Robustly normalizes and decodes an RSA private key from various environment
 * variable representations into a Node.js crypto.KeyObject.
 *
 * Handles:
 * - Multiline PEM strings
 * - Single-line strings with literal \n or escaped \\n
 * - Surrounding quotes (", ', `) introduced by Vercel UI or .env parsers
 * - Escaped quotation marks (\")
 * - Unintentionally pasted entire Service Account JSON files
 * - Missing or malformed PEM header/footer line-wrapping
 * - PKCS#8 (-----BEGIN PRIVATE KEY-----) and PKCS#1 (-----BEGIN RSA PRIVATE KEY-----)
 */
export function normalizePrivateKey(raw: string): crypto.KeyObject {
  if (!raw || typeof raw !== 'string') {
    throw new Error('GA4_PRIVATE_KEY is missing or invalid.');
  }

  // 1. Strip UTF-8 BOM and outer whitespace
  let cleaned = raw.replace(/^\uFEFF/, '').trim();

  // 2. Strip surrounding wrapping quotes (", ', `) repeatedly
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('`') && cleaned.endsWith('`'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // 3. Unescape escaped double quotes if string was serialized as escaped JSON
  if (cleaned.includes('\\"')) {
    cleaned = cleaned.replace(/\\"/g, '"');
  }

  // 4. Check if user pasted the entire Google Service Account JSON credentials file
  if (cleaned.startsWith('{') && cleaned.endsWith('}') && cleaned.includes('"private_key"')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.private_key === 'string') {
        cleaned = parsed.private_key.trim();
      }
    } catch {
      // Continue with normal string processing
    }
  }

  // 5. Strip surrounding wrapping quotes again in case extracted JSON field had them
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('`') && cleaned.endsWith('`'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // 6. Unescape literal newlines and carriage returns
  cleaned = cleaned
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // 7. Strip surrounding wrapping quotes once more if unescaping exposed quotes
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // 8. Attempt 1: Direct parse with crypto.createPrivateKey
  try {
    return crypto.createPrivateKey(cleaned);
  } catch {
    // Continue to reconstruction heuristics below
  }

  // 9. Attempt 2: Reconstruct canonical PEM with 64-character base64 line wrapping
  let header = '-----BEGIN PRIVATE KEY-----';
  let footer = '-----END PRIVATE KEY-----';

  if (cleaned.includes('BEGIN RSA PRIVATE KEY')) {
    header = '-----BEGIN RSA PRIVATE KEY-----';
    footer = '-----END RSA PRIVATE KEY-----';
  } else if (cleaned.includes('BEGIN EC PRIVATE KEY')) {
    header = '-----BEGIN EC PRIVATE KEY-----';
    footer = '-----END EC PRIVATE KEY-----';
  }

  // Strip headers and footers to isolate the raw base64 body
  let body = cleaned;
  if (body.includes('-----BEGIN')) {
    body = body
      .split('\n')
      .filter((line) => !line.includes('-----'))
      .join('');
  }

  // Keep only valid base64 characters
  const cleanB64 = body.replace(/[^A-Za-z0-9+/=]/g, '');

  if (cleanB64.length > 50) {
    const chunks: string[] = [];
    for (let i = 0; i < cleanB64.length; i += 64) {
      chunks.push(cleanB64.slice(i, i + 64));
    }
    const reconstructedPem = `${header}\n${chunks.join('\n')}\n${footer}\n`;

    try {
      return crypto.createPrivateKey(reconstructedPem);
    } catch {
      // Continue to final sanitized error
    }
  }

  throw new Error(
    'Malformed GA4_PRIVATE_KEY: Unable to decode RSA private key. Ensure you paste the full private_key PEM (including BEGIN and END markers) from your Google Cloud Service Account credentials.'
  );
}

/**
 * Exchange a Google Cloud Service Account JWT assertion for a short-lived OAuth2 access token.
 */
async function getGoogleServiceAccountAccessToken(clientEmail: string, rawPrivateKey: string): Promise<string> {
  const keyObject = normalizePrivateKey(rawPrivateKey);

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

  const signature = sign.sign(keyObject, 'base64url');
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
  const rawPropertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA4_PRIVATE_KEY?.trim();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-LCMEK1R5HY';

  if (!rawPropertyId || !clientEmail || !privateKey) {
    const missing: string[] = [];
    if (!rawPropertyId) missing.push('GA4_PROPERTY_ID');
    if (!clientEmail) missing.push('GA4_CLIENT_EMAIL');
    if (!privateKey) missing.push('GA4_PRIVATE_KEY');

    return {
      success: false,
      configured: false,
      requiresConfiguration: true,
      measurementId,
      message: `Google Analytics 4 Data API is not yet configured. Missing environment variables: ${missing.join(', ')}. Web client events continue streaming to tag ${measurementId}.`,
      telemetry: null,
    };
  }

  // Clean property ID (strip "properties/" prefix if user pasted it from Google Cloud console)
  const propertyId = rawPropertyId.replace(/^properties\//, '').trim();

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
        success: false,
        configured: false,
        requiresConfiguration: false,
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
      success: true,
      configured: true,
      requiresConfiguration: false,
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
      success: false,
      configured: false,
      requiresConfiguration: false,
      measurementId,
      message: `Failed to connect to GA4 Data API: ${msg}`,
      telemetry: null,
      error: msg,
    };
  }
}
