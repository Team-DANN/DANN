const { Resend } = require('resend');
const env = require('../config/env');

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

class EmailService {
  static getClient() {
    if (!env.RESEND_API_KEY) {
      const err = new Error('Email verification is not configured. Add RESEND_API_KEY to backend/.env.');
      err.status = 503;
      throw err;
    }
    return new Resend(env.RESEND_API_KEY);
  }

  static async sendVerificationEmail({ name, email, token }) {
    const verificationUrl = new URL('/api/auth/verify-email', env.BACKEND_URL);
    verificationUrl.searchParams.set('token', token);
    const { error } = await this.getClient().emails.send({
      from: env.EMAIL_FROM,
      to: [email],
      subject: 'Confirm your DANN email address',
      html: `<p>Hi ${escapeHtml(name)},</p><p>Confirm your email address to activate your DANN account.</p><p><a href="${verificationUrl}">Confirm email address</a></p><p>This link expires in 24 hours.</p>`,
    });
    if (error) {
      const err = new Error('We could not send the confirmation email. Please try again later.');
      err.status = 502;
      throw err;
    }
  }
}

module.exports = EmailService;
