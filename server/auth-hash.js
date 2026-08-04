'use strict';

const crypto = require('node:crypto');

const N = 16384, r = 8, p = 1, KEYLEN = 32;

function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(plain), salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verifyPassword(plain, stored) {
  try {
    const [alg, n, rr, pp, saltHex, keyHex] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const key = crypto.scryptSync(String(plain), Buffer.from(saltHex, 'hex'), keyHex.length / 2,
      { N: Number(n), r: Number(rr), p: Number(pp) });
    return crypto.timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
