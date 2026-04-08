const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

const ACCESS_LEVEL_CODE_BY_ROLE = {
  tecnico: 1,
  gerente: 2,
  admin: 3
};

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const normalized = input
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padding = normalized.length % 4;
  const withPadding = padding ? normalized + '='.repeat(4 - padding) : normalized;

  return Buffer.from(withPadding, 'base64');
}

function getTokenSecret() {
  if (!process.env.AUTH_TOKEN_SECRET) {
    throw new Error('AUTH_TOKEN_SECRET não configurado');
  }

  return process.env.AUTH_TOKEN_SECRET;
}

function toAccessLevelCode(level) {
  if (level === null || level === undefined || level === '') {
    return null;
  }

  if (typeof level === 'number' && Number.isInteger(level)) {
    return level >= 1 ? level : null;
  }

  const normalized = String(level).trim().toLowerCase();

  if (Object.prototype.hasOwnProperty.call(ACCESS_LEVEL_CODE_BY_ROLE, normalized)) {
    return ACCESS_LEVEL_CODE_BY_ROLE[normalized];
  }

  if (/^\d+$/.test(normalized)) {
    const code = Number(normalized);
    return code >= 1 ? code : null;
  }

  return null;
}

function normalizeAccessLevel(level) {
  return toAccessLevelCode(level);
}

function isValidAccessLevel(level) {
  return Number.isInteger(toAccessLevelCode(level));
}

async function hashPassword(password) {
  const rawPassword = String(password || '');

  if (rawPassword.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(rawPassword, salt, 64);

  return `scrypt$${salt}$${Buffer.from(derivedKey).toString('hex')}`;
}

async function verifyPassword(password, storedValue) {
  const rawPassword = String(password || '');
  const savedValue = String(storedValue || '');

  if (!savedValue) {
    return { matched: false, needsUpgrade: false };
  }

  if (savedValue.startsWith('scrypt$')) {
    const [, salt, hash] = savedValue.split('$');

    if (!salt || !hash) {
      return { matched: false, needsUpgrade: false };
    }

    const derivedKey = await scryptAsync(rawPassword, salt, 64);
    const expectedHash = Buffer.from(hash, 'hex');
    const candidateHash = Buffer.from(derivedKey);

    if (expectedHash.length !== candidateHash.length) {
      return { matched: false, needsUpgrade: false };
    }

    return {
      matched: crypto.timingSafeEqual(expectedHash, candidateHash),
      needsUpgrade: false
    };
  }

  return {
    matched: rawPassword === savedValue,
    needsUpgrade: rawPassword === savedValue
  };
}

function createAuthToken(employee) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const expiresInHours = Number(process.env.AUTH_TOKEN_EXPIRES_HOURS || 12);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: employee.id_funcionario,
    email: employee.email,
    nome: employee.nome,
    nivel_acesso: normalizeAccessLevel(employee.nivel_acesso),
    iat: now,
    exp: now + (expiresInHours * 60 * 60)
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const content = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', getTokenSecret())
    .update(content)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${content}.${signature}`;
}

function verifyAuthToken(token) {
  const [encodedHeader, encodedPayload, signature] = String(token || '').split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Token inválido');
  }

  const content = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', getTokenSecret())
    .update(content)
    .digest();
  const receivedSignature = fromBase64Url(signature);

  if (expectedSignature.length !== receivedSignature.length) {
    throw new Error('Assinatura do token inválida');
  }

  if (!crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
    throw new Error('Assinatura do token inválida');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8'));
  const now = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < now) {
    throw new Error('Token expirado');
  }

  return payload;
}

module.exports = {
  createAuthToken,
  hashPassword,
  isValidAccessLevel,
  normalizeAccessLevel,
  toAccessLevelCode,
  verifyAuthToken,
  verifyPassword
};
