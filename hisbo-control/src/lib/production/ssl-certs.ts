import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';
import { PoolConfig } from 'pg';

/**
 * ====================================================================
 * HISBO CONTROL: Production Database SSL & Certificate Authority Configuration
 * ====================================================================
 *
 * Security Architecture & Guarantees:
 * 1. STRICT CERTIFICATE VALIDATION: rejectUnauthorized is ALWAYS true.
 *    Bypassing certificate validation (rejectUnauthorized: false or
 *    NODE_TLS_REJECT_UNAUTHORIZED=0) is strictly forbidden.
 * 2. SUPABASE ROOT CA CHAIN:
 *    Supabase database clusters and Supavisor/PgBouncer poolers (*.pooler.supabase.com)
 *    use an X.509 certificate chain signed by the Supabase Root 2021 CA.
 *    Because this private Root CA is not in Mozilla's default public Web PKI bundle,
 *    it is securely trusted here as an authorized Root Certificate Authority.
 * 3. RUNTIME & OS COMPATIBILITY:
 *    Inherits all standard public Root CAs (tls.rootCertificates) from Node.js,
 *    allowing connections to AWS RDS, custom managed PostgreSQL, or Let's Encrypt endpoints.
 * 4. CONFIGURABLE OVERRIDES:
 *    Supports optional PROD_SSL_CA (inline PEM) and PROD_SSL_CA_PATH (file path)
 *    for air-gapped or custom enterprise CA environments.
 * ====================================================================
 */

/**
 * Official Supabase Root 2021 CA Certificate
 * Fingerprint (SHA-256): 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
 * Issuer & Subject: CN=Supabase Root 2021 CA, O=Supabase Inc
 * Validity: 2021-04-28 to 2031-04-26
 */
export const SUPABASE_ROOT_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

/**
 * Returns the complete array of trusted Root Certificate Authorities.
 */
export function getTrustedProductionCAs(): string[] {
  const cas: string[] = [];

  // 1. Check for custom CA in environment variable
  if (process.env.PROD_SSL_CA?.trim()) {
    cas.push(process.env.PROD_SSL_CA.trim());
  }

  // 2. Check for custom CA file path
  if (process.env.PROD_SSL_CA_PATH?.trim()) {
    try {
      const resolvedPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PROD_SSL_CA_PATH.trim());
      if (fs.existsSync(resolvedPath)) {
        cas.push(fs.readFileSync(resolvedPath, 'utf8').trim());
      }
    } catch {
      // Ignore file read error; fallback to bundled CA
    }
  }

  // 3. Supabase official Root 2021 CA
  cas.push(SUPABASE_ROOT_CA_PEM.trim());

  // 4. Inherit standard Mozilla / Node.js root CAs
  if (tls.rootCertificates && Array.isArray(tls.rootCertificates)) {
    cas.push(...tls.rootCertificates);
  }

  return cas;
}

/**
 * Generates the strict, verified SSL options object for pg.Pool / pg.Client.
 * rejectUnauthorized is ALWAYS strictly set to true.
 */
export function getProductionSSLOptions(): {
  rejectUnauthorized: true;
  ca: string[];
} {
  return {
    rejectUnauthorized: true,
    ca: getTrustedProductionCAs(),
  };
}

/**
 * Parses a raw PostgreSQL URI and constructs a clean PoolConfig.
 *
 * CRITICAL DRIVER COMPATIBILITY:
 * When connectionString is passed directly to new Pool({ connectionString, ssl: ... }),
 * pg-connection-string parses ?sslmode=require into parsed.ssl = {} and OVERWRITES
 * the custom ssl options. By parsing connection parameters explicitly into host, port,
 * user, password, database, and passing our SSL configuration directly, we guarantee
 * that strict certificate verification and custom CAs are strictly respected by Node TLS.
 */
export function parseProductionPoolConfig(
  rawUri: string,
  options?: Partial<PoolConfig>
): PoolConfig {
  let host = 'localhost';
  let port = 5432;
  let database = 'postgres';
  let user: string | undefined;
  let password: string | undefined;

  try {
    const u = new URL(rawUri);
    host = u.hostname;
    port = u.port ? parseInt(u.port, 10) : 5432;
    database = u.pathname ? u.pathname.replace(/^\//, '') : 'postgres';
    user = u.username ? decodeURIComponent(u.username) : undefined;
    password = u.password ? decodeURIComponent(u.password) : undefined;
  } catch {
    // Basic regex fallback if standard URL parsing fails on unencoded special characters
    const authMatch = rawUri.match(/:\/\/([^@]+)@([^:/]+)(?::(\d+))?(?:\/([^?]+))?/);
    if (authMatch) {
      const userPass = authMatch[1];
      const colonIdx = userPass.indexOf(':');
      if (colonIdx !== -1) {
        user = decodeURIComponent(userPass.slice(0, colonIdx));
        password = decodeURIComponent(userPass.slice(colonIdx + 1));
      } else {
        user = decodeURIComponent(userPass);
      }
      host = authMatch[2];
      port = authMatch[3] ? parseInt(authMatch[3], 10) : 5432;
      database = authMatch[4] ? authMatch[4] : 'postgres';
    }
  }

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: getProductionSSLOptions(),
    max: options?.max ?? 3,
    connectionTimeoutMillis: options?.connectionTimeoutMillis ?? 3000,
    idleTimeoutMillis: options?.idleTimeoutMillis ?? 10000,
    ...options,
  };
}
