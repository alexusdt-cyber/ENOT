import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

let cachedSecret: string | null = null;

export function validateEncryptionConfig(): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return false;
  }
  cachedSecret = secret;
  return true;
}

function getSessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters. Crypto features are disabled.');
  }
  cachedSecret = secret;
  return secret;
}

export function isEncryptionAvailable(): boolean {
  const secret = process.env.SESSION_SECRET;
  return secret !== undefined && secret.length >= 32;
}

function deriveKey(userId: string, salt: Buffer): Buffer {
  const secret = getSessionSecret();
  return crypto.pbkdf2Sync(
    `${secret}:${userId}`,
    salt,
    100000,
    KEY_LENGTH,
    'sha256'
  );
}

export function encrypt(plaintext: string, userId: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(userId, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);
  
  return combined.toString('base64');
}

export function decrypt(ciphertext: string, userId: string): string {
  const combined = Buffer.from(ciphertext, 'base64');
  
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = deriveKey(userId, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function generateUserHash(userId: string): string {
  const secret = getSessionSecret();
  const hash = crypto.createHmac('sha256', secret)
    .update(`wallet-api:${userId}`)
    .digest('hex');
  return hash.substring(0, 40);
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
