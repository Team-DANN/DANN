require('dotenv').config();

const env = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  DEFAULT_BUSINESS_ID: process.env.DEFAULT_BUSINESS_ID || 'biz_default',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
};

if (!env.JWT_SECRET) {
  throw new Error(
    '[ENV] JWT_SECRET is not set. Add it to backend/.env — e.g. run `openssl rand -hex 32` and paste the output.'
  );
}

module.exports = env;
