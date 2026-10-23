import crypto from 'node:crypto';
import { normalizePrivateKey } from '../src/lib/analytics/ga4-client.ts';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const standardPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

function testKeySigning(label, rawKeyInput) {
  try {
    const keyObject = normalizePrivateKey(rawKeyInput);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update('ga4-test-telemetry-payload');
    const signature = sign.sign(keyObject, 'base64url');
    assert(!!signature && signature.length > 50, label);
  } catch (err) {
    assert(false, `${label} -> ${err.message}`);
  }
}

console.log('=== TEST SUITE: GA4 Private Key Normalization & Parsing ===\n');

// 1. Standard multiline PEM
testKeySigning('1. Standard Multiline PEM', standardPem);

// 2. Vercel single-line with literal \\n
testKeySigning('2. Single-line with literal \\n', standardPem.replace(/\n/g, '\\n'));

// 3. Vercel single-line wrapped in double quotes
testKeySigning('3. Double-quoted single-line with \\n', `"${standardPem.replace(/\n/g, '\\n')}"`);

// 4. Single-quoted single-line with \\n
testKeySigning('4. Single-quoted single-line with \\n', `'${standardPem.replace(/\n/g, '\\n')}'`);

// 5. Multiline PEM with surrounding double quotes
testKeySigning('5. Double-quoted multiline PEM', `"${standardPem}"`);

// 6. Multiline PEM with backticks
testKeySigning('6. Backtick-wrapped multiline PEM', `\`${standardPem}\``);

// 7. Double-escaped backslash-n (\\\\n)
testKeySigning('7. Double-escaped newlines (\\\\n)', standardPem.replace(/\n/g, '\\\\n'));

// 8. Windows CRLF
testKeySigning('8. Windows CRLF (\\r\\n)', standardPem.replace(/\n/g, '\r\n'));

// 9. Raw base64 body without PEM headers
const rawB64 = standardPem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').trim();
testKeySigning('9. Raw base64 body without headers', rawB64);

// 10. Whole Google Cloud Service Account JSON file
const serviceAccountJson = JSON.stringify({
  type: 'service_account',
  project_id: 'spendwise-test',
  private_key_id: 'abc123456789',
  private_key: standardPem,
  client_email: 'test-service-acct@spendwise-test.iam.gserviceaccount.com',
});
testKeySigning('10. Entire Service Account JSON credentials string', serviceAccountJson);

// 11. Escaped quoted JSON string (pasted with quotes)
testKeySigning('11. Escaped double-quoted JSON string', `"${serviceAccountJson.replace(/"/g, '\\"')}"`);

// 12. Messy whitespace and spaces in base64 body
const messyPem = `  -----BEGIN PRIVATE KEY-----  \n  ${rawB64.replace(/\s+/g, ' ')}   \n-----END PRIVATE KEY-----  \n`;
testKeySigning('12. Messy whitespace and spaces in PEM body', messyPem);

// 13. Invalid keys properly rejected with clean sanitized error
try {
  normalizePrivateKey('not-a-valid-key');
  assert(false, '13. Invalid key should have thrown');
} catch (err) {
  assert(
    err.message.includes('Malformed GA4_PRIVATE_KEY'),
    `13. Invalid key correctly rejected: ${err.message}`
  );
}

// 14. Empty key properly rejected
try {
  normalizePrivateKey('');
  assert(false, '14. Empty key should have thrown');
} catch (err) {
  assert(
    err.message.includes('missing or invalid'),
    `14. Empty key correctly rejected: ${err.message}`
  );
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}

