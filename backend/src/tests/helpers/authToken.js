const jwt = require('jsonwebtoken');
const env = require('../../config/env');

function tokenFor(user_id, business_id) {
  return jwt.sign({ user_id, business_id }, env.JWT_SECRET, { expiresIn: '1h' });
}

module.exports = { tokenFor };