const transporter = require('../config/smtp');

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"Emma Telecom" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('[EMAIL] ✅ Sent to:', to);
  } catch (err) {
    console.error('[EMAIL] ❌ Failed to send:', err.message);
  }
}

module.exports = sendEmail;
