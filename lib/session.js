// Assinatura de sessão simples usando Web Crypto (funciona tanto no
// middleware, que roda no Edge runtime, quanto nas rotas de API, que
// rodam no Node runtime).

const SESSION_COOKIE_NAME = 'controle_larissa_session';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(signature));
}

async function createSessionToken(secret) {
  const expires = Date.now() + MAX_AGE_MS;
  const payload = String(expires);
  const signature = await hmac(secret, payload);
  return payload + '.' + signature;
}

async function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) return false;
  const [payload, signature] = token.split('.');
  const expires = parseInt(payload, 10);
  if (!expires || Date.now() > expires) return false;
  const expected = await hmac(secret, payload);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return mismatch === 0;
}

module.exports = { SESSION_COOKIE_NAME, MAX_AGE_MS, createSessionToken, verifySessionToken, base64UrlToBytes };
