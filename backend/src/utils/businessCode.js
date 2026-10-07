const crypto = require('crypto');

// No 0/O/1/I, so a code read off a phone screen or typed from a
// whiteboard can't be mistyped.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateBusinessCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

module.exports = { generateBusinessCode };