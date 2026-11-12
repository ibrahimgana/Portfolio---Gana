'use strict';

const crypto = require('crypto');

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: 64 * 1024 * 1024
  });
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data.replace(/\r?\n$/, '')));
    process.stdin.on('error', reject);
  });
}

(async () => {
  const argument = process.argv.slice(2).join(' ');
  if (argument) {
    console.error('Tip: pipe the password on stdin to keep it out of shell history.');
  }

  const password = argument || await readStdin();
  if (!password) {
    console.error('Usage: node scripts/hash-work-password.js "<password>"');
    console.error('   or: echo "<password>" | node scripts/hash-work-password.js');
    process.exit(1);
  }

  if (password.length > 1024) {
    console.error('Password is too long.');
    process.exit(1);
  }

  process.stdout.write(hashPassword(password) + '\n');
})();
