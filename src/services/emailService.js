const nodemailer = require('nodemailer');
const dns = require('dns');
const createLogger = require('../utils/logger');
require('dotenv').config();

const logger = createLogger('EMAIL');

// Prevent IPv6 timeout issues
dns.setDefaultResultOrder('ipv4first');

// Configure Gmail Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: true, // use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify the connection on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error(`❌ Gmail SMTP connection failed: ${error.message}`);
  } else {
    logger.info(`✅ Gmail SMTP connection successful and ready to send mail: ${success}`);
  }
});

async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'no-reply@yourapp.com',
    to,
    subject: 'Your password reset OTP',
    text: `Use the following OTP to reset your password. It expires in 10 minutes.\n\nOTP: ${otp}`,
    html: `<p>Use the following OTP to reset your password. It expires in 10 minutes.</p>
           <p><b>${otp}</b></p>`,
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
