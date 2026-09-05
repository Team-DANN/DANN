require('dotenv').config();

const env = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  DEFAULT_BUSINESS_ID: process.env.DEFAULT_BUSINESS_ID || 'biz_default',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};

if (!env.JWT_SECRET) {
  throw new Error(
    '[ENV] JWT_SECRET is not set. Add it to backend/.env — e.g. run `openssl rand -hex 32` and paste the output.'
  );
}

module.exports = env;