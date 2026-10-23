import crypto from 'node:crypto';

/**
 * ====================================================================
 * HISBO CONTROL: Google Analytics 4 Advanced Data API Client (Read-Only)
 * ====================================================================
 *
 * Requirements:
 * 1. Zero dependencies: Uses standard node:crypto and native fetch.
 * 2. Scoped to read-only: https://www.googleapis.com/auth/analytics.readonly.
 * 3. Never prints or exposes private keys.
 * 4. Never fabricates or invents visitor telemetry.
 * 5. Returns real metric values or explicit configuration status.
 * 6. Robust OpenSSL 3.x key normalization across Vercel and local environments.
 * 7. In-memory caching with TTL to preserve GA4 Data API quota limits.
 * ====================================================================
 */

// Legacy telemetry metrics interface for backward compatibility
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

// Advanced report models
export interface GA4OverviewMetricItem {
  value: number;
  previousValue: number;
  changePercent: number | null; // e.g. +14.2 or -3.5; null if no previous data
}

export interface GA4OverviewData {
  activeUsers: GA4OverviewMetricItem;
  totalUsers: GA4OverviewMetricItem;
  newUsers: GA4OverviewMetricItem;
  sessions: GA4OverviewMetricItem;
  pageviews: GA4OverviewMetricItem;
  engagementRate: GA4OverviewMetricItem; // percentage (0 - 100)
  bounceRate: GA4OverviewMetricItem; // percentage (0 - 100)
  avgEngagementDurationSeconds: GA4OverviewMetricItem; // in seconds
  eventsPerSession: GA4OverviewMetricItem;
}

export interface GA4DailyDataPoint {
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Oct 22"
  activeUsers: number;
  sessions: number;
  pageviews: number;
}

export interface GA4ChannelData {
  channel: string;
  sessions: number;
  activeUsers: number;
  engagementRate: number;
  share: number;
}

export interface GA4SourceData {
  sourceMedium: string;
  sessions: number;
  activeUsers: number;
  share: number;
}

export interface GA4CampaignData {
  campaign: string;
  sessions: number;
  activeUsers: number;
}

export interface GA4GeoData {
  country: string;
  city: string;
  activeUsers: number;
  sessions: number;
  share: number;
}

export interface GA4DeviceData {
  device: string; // 'mobile', 'desktop', 'tablet'
  activeUsers: number;
  sessions: number;
  share: number;
}

export interface GA4TechData {
  browser: string;
  operatingSystem: string;
  activeUsers: number;
  sessions: number;
}

export interface GA4UserTypeData {
  userType: string; // 'New User', 'Returning User'
  activeUsers: number;
  share: number;
}

export interface GA4PageData {
  path: string;
  title: string;
  views: number;
  activeUsers: number;
  avgDurationSeconds: number;
  viewsPerSession: number;
}

export interface GA4EventData {
  eventName: string;
  count: number;
  users: number;
}

export interface GA4ConversionEvent {
  eventName: string;
  displayName: string;
  category: string;
  count: number;
  users: number;
  isInstrumented: boolean;
  description: string;
}

export interface AdvancedGA4ReportData {
  range: string;
  startDate: string;
  endDate: string;
  comparisonStartDate: string;
  comparisonEndDate: string;
  cachedAt: string;
  overview: GA4OverviewData;
  dailyTrend: GA4DailyDataPoint[];
  channels: GA4ChannelData[];
  sources: GA4SourceData[];
  campaigns: GA4CampaignData[];
  geo: GA4GeoData[];
  devices: GA4DeviceData[];
  tech: GA4TechData[];
  userTypes: GA4UserTypeData[];
  pages: GA4PageData[];
  events: GA4EventData[];
  conversions: GA4ConversionEvent[];
}

export interface AdvancedGA4ReportResult {
  success: boolean;
  configured: boolean;
  requiresConfiguration?: boolean;
  measurementId: string;
  message: string;
  report: AdvancedGA4ReportData | null;
  telemetry?: GA4TelemetryMetrics | null;
  error?: string;
}

export interface GA4RealtimeData {
  activeUsersLast30m: number;
  topPages: { path: string; activeUsers: number }[];
  topCountries: { country: string; activeUsers: number }[];
  topDevices: { device: string; activeUsers: number }[];
  timestamp: string;
}

export interface GA4RealtimeResult {
  success: boolean;
  configured: boolean;
  requiresConfiguration?: boolean;
  measurementId: string;
  realtime: GA4RealtimeData | null;
  error?: string;
  message: string;
}

// In-memory cache structures with TTL
const reportCache = new Map<string, { data: AdvancedGA4ReportData; expiresAt: number }>();
let realtimeCache: { data: GA4RealtimeData; expiresAt: number } | null = null;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

const REPORT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const REALTIME_CACHE_TTL_MS = 25 * 1000; // 25 seconds

/**
 * Robustly normalizes and decodes an RSA private key from various environment
 * variable representations into a Node.js crypto.KeyObject.
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
 * Caches access token for 50 minutes to avoid redundant OAuth calls.
 */
async function getGoogleServiceAccountAccessToken(clientEmail: string, rawPrivateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const keyObject = normalizePrivateKey(rawPrivateKey);

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
  const token = tokenData.access_token;
  const expiresIn = typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 3600;

  cachedAccessToken = {
    token,
    expiresAt: now + expiresIn,
  };

  return token;
}

/**
 * Format raw GA4 YYYYMMDD date string to ISO and human readable label.
 */
function formatGA4Date(raw: string): { iso: string; label: string } {
  if (raw && raw.length === 8) {
    const y = raw.substring(0, 4);
    const m = raw.substring(4, 6);
    const d = raw.substring(6, 8);
    const dateObj = new Date(`${y}-${m}-${d}T00:00:00Z`);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { iso: `${y}-${m}-${d}`, label };
  }
  return { iso: raw, label: raw };
}

/**
 * Calculate percentage change safely.
 */
function calculateChangePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10;
}

/**
 * Resolve date ranges and comparison ranges based on query parameters.
 */
function resolveDateRanges(
  range: string,
  customStart?: string,
  customEnd?: string
): {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
} {
  const now = new Date();

  if (range === 'today') {
    return {
      currentStart: 'today',
      currentEnd: 'today',
      previousStart: 'yesterday',
      previousEnd: 'yesterday',
    };
  }

  if (range === '7d') {
    return {
      currentStart: '7daysAgo',
      currentEnd: 'today',
      previousStart: '14daysAgo',
      previousEnd: '8daysAgo',
    };
  }

  if (range === '90d') {
    return {
      currentStart: '90daysAgo',
      currentEnd: 'today',
      previousStart: '180daysAgo',
      previousEnd: '91daysAgo',
    };
  }

  if (range === 'custom' && customStart && customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customStart) && /^\d{4}-\d{2}-\d{2}$/.test(customEnd)) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const diffDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const prevEnd = new Date(start.getTime() - (1000 * 60 * 60 * 24));
    const prevStart = new Date(prevEnd.getTime() - (diffDays - 1) * (1000 * 60 * 60 * 24));

    return {
      currentStart: customStart,
      currentEnd: customEnd,
      previousStart: prevStart.toISOString().split('T')[0],
      previousEnd: prevEnd.toISOString().split('T')[0],
    };
  }

  // Default: 28 days
  return {
    currentStart: '28daysAgo',
    currentEnd: 'today',
    previousStart: '56daysAgo',
    previousEnd: '29daysAgo',
  };
}

/**
 * Helper to execute a runReport call against Google Analytics Data API.
 */
async function executeGA4Report(
  accessToken: string,
  propertyId: string,
  body: object
): Promise<any> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = 'Google Analytics Data API request failed';
    try {
      const json = JSON.parse(errText);
      msg = json.error?.message || errText;
    } catch {
      msg = errText;
    }
    throw new Error(msg);
  }

  return await res.json();
}

/**
 * Fetch advanced comprehensive GA4 telemetry with breakdown dimensions and period comparison.
 */
export async function fetchAdvancedGA4Report(options?: {
  range?: string;
  startDate?: string;
  endDate?: string;
  forceRefresh?: boolean;
}): Promise<AdvancedGA4ReportResult> {
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
      message: `Google Analytics 4 Data API is not yet configured. Missing: ${missing.join(', ')}.`,
      report: null,
      telemetry: null,
    };
  }

  const propertyId = rawPropertyId.replace(/^properties\//, '').trim();
  const range = options?.range || '28d';
  const customStart = options?.startDate;
  const customEnd = options?.endDate;
  const forceRefresh = options?.forceRefresh ?? false;

  const { currentStart, currentEnd, previousStart, previousEnd } = resolveDateRanges(
    range,
    customStart,
    customEnd
  );

  const cacheKey = `${propertyId}_${currentStart}_${currentEnd}_${previousStart}_${previousEnd}`;

  if (!forceRefresh) {
    const cached = reportCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const legacyTelemetry: GA4TelemetryMetrics = {
        activeUsers28d: cached.data.overview.activeUsers.value,
        totalSessions: cached.data.overview.sessions.value,
        bounceRate: cached.data.overview.bounceRate.value,
      };
      return {
        success: true,
        configured: true,
        requiresConfiguration: false,
        measurementId,
        message: 'Loaded from server cache.',
        report: cached.data,
        telemetry: legacyTelemetry,
      };
    }
  }

  try {
    const accessToken = await getGoogleServiceAccountAccessToken(clientEmail, privateKey);

    // Run parallel GA4 queries
    const [
      currentOverviewRaw,
      previousOverviewRaw,
      dailyTrendRaw,
      channelsRaw,
      sourcesRaw,
      campaignsRaw,
      geoRaw,
      devicesRaw,
      techRaw,
      userTypesRaw,
      pagesRaw,
      eventsRaw,
    ] = await Promise.all([
      // 1. Current Overview Metrics
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
          { name: 'userEngagementDuration' },
          { name: 'eventsPerSession' },
        ],
      }),

      // 2. Previous Period Overview Metrics (for comparison)
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: previousStart, endDate: previousEnd }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
          { name: 'userEngagementDuration' },
          { name: 'eventsPerSession' },
        ],
      }),

      // 3. Daily Trend
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),

      // 4. Default Channel Groups
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
        ],
        orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
      }),

      // 5. Source / Medium
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
        limit: 15,
      }),

      // 6. Campaigns
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
        limit: 10,
      }),

      // 7. Geo (Country & City)
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ desc: true, metric: { metricName: 'activeUsers' } }],
        limit: 20,
      }),

      // 8. Device Category
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      }),

      // 9. Browser & OS
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'browser' }, { name: 'operatingSystem' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ desc: true, metric: { metricName: 'activeUsers' } }],
        limit: 15,
      }),

      // 10. New vs Returning Users
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
      }),

      // 11. Top Pages
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'userEngagementDuration' },
          { name: 'screenPageViewsPerSession' },
        ],
        orderBys: [{ desc: true, metric: { metricName: 'screenPageViews' } }],
        limit: 25,
      }),

      // 12. Top Tracked Events
      executeGA4Report(accessToken, propertyId, {
        dateRanges: [{ startDate: currentStart, endDate: currentEnd }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
        orderBys: [{ desc: true, metric: { metricName: 'eventCount' } }],
        limit: 25,
      }),
    ]);

    // Parse Overview Metrics
    const cVals = currentOverviewRaw.rows?.[0]?.metricValues || [];
    const pVals = previousOverviewRaw.rows?.[0]?.metricValues || [];

    const num = (v: any) => (v?.value ? parseFloat(v.value) : 0);
    const int = (v: any) => (v?.value ? parseInt(v.value, 10) : 0);

    const cActive = int(cVals[0]);
    const pActive = int(pVals[0]);

    const cTotal = int(cVals[1]);
    const pTotal = int(pVals[1]);

    const cNew = int(cVals[2]);
    const pNew = int(pVals[2]);

    const cSessions = int(cVals[3]);
    const pSessions = int(pVals[3]);

    const cViews = int(cVals[4]);
    const pViews = int(pVals[4]);

    const cEngRate = Math.round(num(cVals[5]) * 100 * 10) / 10;
    const pEngRate = Math.round(num(pVals[5]) * 100 * 10) / 10;

    const cBounce = Math.round(num(cVals[6]) * 100 * 10) / 10;
    const pBounce = Math.round(num(pVals[6]) * 100 * 10) / 10;

    const cTotalDuration = num(cVals[7]);
    const pTotalDuration = num(pVals[7]);
    const cAvgDuration = cSessions > 0 ? Math.round(cTotalDuration / cSessions) : 0;
    const pAvgDuration = pSessions > 0 ? Math.round(pTotalDuration / pSessions) : 0;

    const cEvPerSess = Math.round(num(cVals[8]) * 10) / 10;
    const pEvPerSess = Math.round(num(pVals[8]) * 10) / 10;

    const overview: GA4OverviewData = {
      activeUsers: { value: cActive, previousValue: pActive, changePercent: calculateChangePercent(cActive, pActive) },
      totalUsers: { value: cTotal, previousValue: pTotal, changePercent: calculateChangePercent(cTotal, pTotal) },
      newUsers: { value: cNew, previousValue: pNew, changePercent: calculateChangePercent(cNew, pNew) },
      sessions: { value: cSessions, previousValue: pSessions, changePercent: calculateChangePercent(cSessions, pSessions) },
      pageviews: { value: cViews, previousValue: pViews, changePercent: calculateChangePercent(cViews, pViews) },
      engagementRate: { value: cEngRate, previousValue: pEngRate, changePercent: calculateChangePercent(cEngRate, pEngRate) },
      bounceRate: { value: cBounce, previousValue: pBounce, changePercent: calculateChangePercent(cBounce, pBounce) },
      avgEngagementDurationSeconds: { value: cAvgDuration, previousValue: pAvgDuration, changePercent: calculateChangePercent(cAvgDuration, pAvgDuration) },
      eventsPerSession: { value: cEvPerSess, previousValue: pEvPerSess, changePercent: calculateChangePercent(cEvPerSess, pEvPerSess) },
    };

    // Parse Daily Trend
    const dailyTrend: GA4DailyDataPoint[] = (dailyTrendRaw.rows || []).map((row: any) => {
      const rawDate = row.dimensionValues?.[0]?.value || '';
      const { iso, label } = formatGA4Date(rawDate);
      return {
        date: iso,
        formattedDate: label,
        activeUsers: int(row.metricValues?.[0]),
        sessions: int(row.metricValues?.[1]),
        pageviews: int(row.metricValues?.[2]),
      };
    });

    // Parse Channels
    const totalChannelSessions = (channelsRaw.rows || []).reduce((acc: number, r: any) => acc + int(r.metricValues?.[0]), 0) || 1;
    const channels: GA4ChannelData[] = (channelsRaw.rows || []).map((row: any) => {
      const sess = int(row.metricValues?.[0]);
      return {
        channel: row.dimensionValues?.[0]?.value || 'Unassigned',
        sessions: sess,
        activeUsers: int(row.metricValues?.[1]),
        engagementRate: Math.round(num(row.metricValues?.[2]) * 100 * 10) / 10,
        share: Math.round((sess / totalChannelSessions) * 100 * 10) / 10,
      };
    });

    // Parse Sources
    const totalSourceSessions = (sourcesRaw.rows || []).reduce((acc: number, r: any) => acc + int(r.metricValues?.[0]), 0) || 1;
    const sources: GA4SourceData[] = (sourcesRaw.rows || []).map((row: any) => {
      const sess = int(row.metricValues?.[0]);
      return {
        sourceMedium: row.dimensionValues?.[0]?.value || '(direct) / (none)',
        sessions: sess,
        activeUsers: int(row.metricValues?.[1]),
        share: Math.round((sess / totalSourceSessions) * 100 * 10) / 10,
      };
    });

    // Parse Campaigns
    const campaigns: GA4CampaignData[] = (campaignsRaw.rows || [])
      .filter((r: any) => r.dimensionValues?.[0]?.value && r.dimensionValues[0].value !== '(not set)' && r.dimensionValues[0].value !== '(direct)')
      .map((row: any) => ({
        campaign: row.dimensionValues[0].value,
        sessions: int(row.metricValues?.[0]),
        activeUsers: int(row.metricValues?.[1]),
      }));

    // Parse Geo
    const totalGeoUsers = (geoRaw.rows || []).reduce((acc: number, r: any) => acc + int(r.metricValues?.[0]), 0) || 1;
    const geo: GA4GeoData[] = (geoRaw.rows || []).map((row: any) => {
      const users = int(row.metricValues?.[0]);
      return {
        country: row.dimensionValues?.[0]?.value || 'Unknown',
        city: row.dimensionValues?.[1]?.value || 'Unknown',
        activeUsers: users,
        sessions: int(row.metricValues?.[1]),
        share: Math.round((users / totalGeoUsers) * 100 * 10) / 10,
      };
    });

    // Parse Devices
    const totalDeviceUsers = (devicesRaw.rows || []).reduce((acc: number, r: any) => acc + int(r.metricValues?.[0]), 0) || 1;
    const devices: GA4DeviceData[] = (devicesRaw.rows || []).map((row: any) => {
      const users = int(row.metricValues?.[0]);
      return {
        device: row.dimensionValues?.[0]?.value || 'desktop',
        activeUsers: users,
        sessions: int(row.metricValues?.[1]),
        share: Math.round((users / totalDeviceUsers) * 100 * 10) / 10,
      };
    });

    // Parse Tech (Browser / OS)
    const tech: GA4TechData[] = (techRaw.rows || []).map((row: any) => ({
      browser: row.dimensionValues?.[0]?.value || 'Unknown',
      operatingSystem: row.dimensionValues?.[1]?.value || 'Unknown',
      activeUsers: int(row.metricValues?.[0]),
      sessions: int(row.metricValues?.[1]),
    }));

    // Parse User Types (New vs Returning)
    const totalUserTypeUsers = (userTypesRaw.rows || []).reduce((acc: number, r: any) => acc + int(r.metricValues?.[0]), 0) || 1;
    const userTypes: GA4UserTypeData[] = (userTypesRaw.rows || []).map((row: any) => {
      const rawType = row.dimensionValues?.[0]?.value || 'new';
      const users = int(row.metricValues?.[0]);
      return {
        userType: rawType === 'new' ? 'New Users' : rawType === 'returning' ? 'Returning Users' : rawType,
        activeUsers: users,
        share: Math.round((users / totalUserTypeUsers) * 100 * 10) / 10,
      };
    });

    // Parse Pages
    const pages: GA4PageData[] = (pagesRaw.rows || []).map((row: any) => {
      const views = int(row.metricValues?.[0]);
      const users = int(row.metricValues?.[1]);
      const totalDur = num(row.metricValues?.[2]);
      const avgDur = users > 0 ? Math.round(totalDur / users) : 0;
      const vps = Math.round(num(row.metricValues?.[3]) * 10) / 10;
      return {
        path: row.dimensionValues?.[0]?.value || '/',
        title: row.dimensionValues?.[1]?.value || 'Untitled',
        views,
        activeUsers: users,
        avgDurationSeconds: avgDur,
        viewsPerSession: vps,
      };
    });

    // Parse Events
    const events: GA4EventData[] = (eventsRaw.rows || []).map((row: any) => ({
      eventName: row.dimensionValues?.[0]?.value || 'unknown',
      count: int(row.metricValues?.[0]),
      users: int(row.metricValues?.[1]),
    }));

    // Map Conversions / Key Events
    // Check which key actions are captured in GA4
    const keyConversionCatalog = [
      { eventName: 'login', displayName: 'Account Sign In', category: 'Authentication', description: 'User authenticated into Hisbo web application' },
      { eventName: 'sign_up', displayName: 'New User Registration', category: 'Acquisition', description: 'New customer account created' },
      { eventName: 'expense_created', displayName: 'Expense Logged', category: 'Engagement', description: 'Customer recorded a financial transaction' },
      { eventName: 'sync_completed', displayName: 'Cloud Ledger Sync', category: 'Retention', description: 'Financial ledger synchronized with cloud database' },
      { eventName: 'dashboard_viewed', displayName: 'Dashboard Loaded', category: 'Activation', description: 'User opened their personal financial dashboard' },
      { eventName: 'feature_opened', displayName: 'Module Interaction', category: 'Engagement', description: 'User opened an interactive tool or modal' },
      { eventName: 'privacy_changed', displayName: 'Privacy Adjustment', category: 'Compliance', description: 'User modified privacy or sharing preferences' },
    ];

    const conversions: GA4ConversionEvent[] = keyConversionCatalog.map((catalogItem) => {
      const match = events.find((e) => e.eventName.toLowerCase() === catalogItem.eventName.toLowerCase());
      if (match) {
        return {
          eventName: catalogItem.eventName,
          displayName: catalogItem.displayName,
          category: catalogItem.category,
          count: match.count,
          users: match.users,
          isInstrumented: true,
          description: catalogItem.description,
        };
      }
      return {
        eventName: catalogItem.eventName,
        displayName: catalogItem.displayName,
        category: catalogItem.category,
        count: 0,
        users: 0,
        isInstrumented: false,
        description: catalogItem.description,
      };
    });

    const reportData: AdvancedGA4ReportData = {
      range,
      startDate: currentStart,
      endDate: currentEnd,
      comparisonStartDate: previousStart,
      comparisonEndDate: previousEnd,
      cachedAt: new Date().toISOString(),
      overview,
      dailyTrend,
      channels,
      sources,
      campaigns,
      geo,
      devices,
      tech,
      userTypes,
      pages,
      events,
      conversions,
    };

    // Store in cache
    reportCache.set(cacheKey, {
      data: reportData,
      expiresAt: Date.now() + REPORT_CACHE_TTL_MS,
    });

    const legacyTelemetry: GA4TelemetryMetrics = {
      activeUsers28d: overview.activeUsers.value,
      totalSessions: overview.sessions.value,
      bounceRate: overview.bounceRate.value,
    };

    return {
      success: true,
      configured: true,
      requiresConfiguration: false,
      measurementId,
      message: 'Advanced GA4 telemetry report generated successfully.',
      report: reportData,
      telemetry: legacyTelemetry,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown GA4 telemetry error';
    return {
      success: false,
      configured: false,
      requiresConfiguration: false,
      measurementId,
      message: `Failed to connect to GA4 Data API: ${msg}`,
      report: null,
      telemetry: null,
      error: msg,
    };
  }
}

/**
 * Fetch real-time GA4 telemetry (last 30 minutes) using runRealtimeReport.
 */
export async function fetchLiveGA4Realtime(options?: { forceRefresh?: boolean }): Promise<GA4RealtimeResult> {
  const rawPropertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA4_PRIVATE_KEY?.trim();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-LCMEK1R5HY';

  if (!rawPropertyId || !clientEmail || !privateKey) {
    return {
      success: false,
      configured: false,
      requiresConfiguration: true,
      measurementId,
      realtime: null,
      message: 'GA4 credentials not configured.',
    };
  }

  const propertyId = rawPropertyId.replace(/^properties\//, '').trim();

  if (!options?.forceRefresh && realtimeCache && realtimeCache.expiresAt > Date.now()) {
    return {
      success: true,
      configured: true,
      requiresConfiguration: false,
      measurementId,
      realtime: realtimeCache.data,
      message: 'Realtime data loaded from cache.',
    };
  }

  try {
    const accessToken = await getGoogleServiceAccountAccessToken(clientEmail, privateKey);
    const rtUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runRealtimeReport`;

    const int = (v: any) => (v?.value ? parseInt(v.value, 10) : 0);

    const [activeUsersRaw, pagesRaw, geoRaw, devicesRaw] = await Promise.all([
      // 1. Total Active Users (Last 30m)
      fetch(rtUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] }),
      }).then((r) => r.json()),

      // 2. Top Active Pages
      fetch(rtUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: [{ name: 'unifiedScreenName' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 5,
        }),
      }).then((r) => r.json()),

      // 3. Top Countries
      fetch(rtUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 5,
        }),
      }).then((r) => r.json()),

      // 4. Top Devices
      fetch(rtUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        }),
      }).then((r) => r.json()),
    ]);

    const activeUsersLast30m = int(activeUsersRaw.rows?.[0]?.metricValues?.[0]);

    const topPages = (pagesRaw.rows || []).map((row: any) => ({
      path: row.dimensionValues?.[0]?.value || '/',
      activeUsers: int(row.metricValues?.[0]),
    }));

    const topCountries = (geoRaw.rows || []).map((row: any) => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      activeUsers: int(row.metricValues?.[0]),
    }));

    const topDevices = (devicesRaw.rows || []).map((row: any) => ({
      device: row.dimensionValues?.[0]?.value || 'desktop',
      activeUsers: int(row.metricValues?.[0]),
    }));

    const realtimeData: GA4RealtimeData = {
      activeUsersLast30m,
      topPages,
      topCountries,
      topDevices,
      timestamp: new Date().toISOString(),
    };

    realtimeCache = {
      data: realtimeData,
      expiresAt: Date.now() + REALTIME_CACHE_TTL_MS,
    };

    return {
      success: true,
      configured: true,
      requiresConfiguration: false,
      measurementId,
      realtime: realtimeData,
      message: 'Realtime GA4 telemetry retrieved successfully.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Realtime GA4 query failed';
    return {
      success: false,
      configured: false,
      requiresConfiguration: false,
      measurementId,
      realtime: null,
      message: msg,
      error: msg,
    };
  }
}

/**
 * Backward compatibility wrapper for existing simple calls.
 */
export async function fetchLiveGA4Telemetry(): Promise<GA4TelemetryResult> {
  const result = await fetchAdvancedGA4Report({ range: '28d' });
  return {
    success: result.success,
    configured: result.configured,
    requiresConfiguration: result.requiresConfiguration,
    measurementId: result.measurementId,
    message: result.message,
    telemetry: result.telemetry || null,
    error: result.error,
  };
}
