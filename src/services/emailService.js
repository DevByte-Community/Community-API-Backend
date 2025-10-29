const nodemailer = require('nodemailer');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const createLogger = require('../utils/logger');
require('dotenv').config();

const logger = createLogger('EMAIL');

// Prevent IPv6 timeout issues
dns.setDefaultResultOrder('ipv4first');

// Configure Gmail Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  // port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false, // use STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3', // Some hosts require this
  },
  requireTLS: true, // Force STARTTLS
  connectionTimeout: 10000,
});

// Verify the connection on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error(`❌ SMTP connection failed: ${error.message}`);
  } else {
    logger.info(`✅ SMTP connection successful and ready to send mail: ${success}`);
  }
});

async function sendOtpEmail(to, otp) {
  const templatePath = path.join(process.cwd(), 'templates', 'otp-confirmation.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace('{{OTP_CODE}}', otp).replace('{{CURRENT_YEAR}}', new Date().getFullYear());
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your password reset OTP',
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ OTP email successfully sent to ${to}`);
    return info;
  } catch (err) {
    logger.error(`❌ Failed to send OTP email to ${to} - ${err.message}`);
    throw err;
  }
}

module.exports = { sendOtpEmail };
