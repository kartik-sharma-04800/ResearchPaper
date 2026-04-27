const nodemailer = require('nodemailer');
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};
/**
 * Send anomaly alert email to the user
 */
const sendAnomalyAlert = async ({ to, userName, severity, loginDetails, mfaCode }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`📧 [DEV] Email would be sent to ${to} — anomaly alert (${severity})`);
    return { success: true, preview: 'dev-mode-no-email' };
  }
  const severityLabel = severity === 'high' ? '🔴 HIGH RISK' : '🟡 LOW RISK';
  const subject = `${severityLabel} — Suspicious Login Detected on Your Account`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0a0f1e; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; border: 1px solid ${severity === 'high' ? '#ef4444' : '#f59e0b'};">
    <div style="background: ${severity === 'high' ? '#7f1d1d' : '#78350f'}; padding: 24px 32px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">⚠️ Suspicious Login Detected</h1>
      <p style="color: #fca5a5; margin: 8px 0 0;">Risk Level: <strong>${severityLabel}</strong></p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #e5e7eb;">Hello <strong>${userName}</strong>,</p>
      <p style="color: #9ca3af;">We detected a login to your account that doesn't match your usual patterns.</p>
      <div style="background: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #f9fafb; margin-top: 0;">Login Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #6b7280; padding: 6px 0;">Time</td><td style="color: #e5e7eb;">${loginDetails.time}</td></tr>
          <tr><td style="color: #6b7280; padding: 6px 0;">IP Address</td><td style="color: #e5e7eb;">${loginDetails.ip}</td></tr>
          <tr><td style="color: #6b7280; padding: 6px 0;">Location</td><td style="color: #e5e7eb;">${loginDetails.location}</td></tr>
          <tr><td style="color: #6b7280; padding: 6px 0;">Device</td><td style="color: #e5e7eb;">${loginDetails.device}</td></tr>
          <tr><td style="color: #6b7280; padding: 6px 0;">Browser</td><td style="color: #e5e7eb;">${loginDetails.browser}</td></tr>
        </table>
      </div>
      ${mfaCode ? `
      <div style="background: #064e3b; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #6ee7b7; margin: 0 0 8px;">Your verification code:</p>
        <h2 style="color: #fff; font-size: 36px; letter-spacing: 8px; margin: 0;">${mfaCode}</h2>
        <p style="color: #6ee7b7; font-size: 12px; margin: 8px 0 0;">Valid for 10 minutes</p>
      </div>
      ` : ''}
      <p style="color: #9ca3af; font-size: 14px;">If this was you, no action is needed. If you did not initiate this login, please change your password immediately.</p>
    </div>
    <div style="background: #1f2937; padding: 16px 32px; text-align: center;">
      <p style="color: #4b5563; font-size: 12px; margin: 0;">Anomaly Detection System — ICCIMMR 2026 Research Project</p>
    </div>
  </div>
</body>
</html>`;
  try {
    const info = await transporter.sendMail({ from: `"Security System" <${process.env.EMAIL_USER}>`, to, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { success: false, error: err.message };
  }
};
/**
 * Send MFA code email
 */
const sendMfaCode = async ({ to, userName, code }) => {
  return sendAnomalyAlert({ to, userName, severity: 'low', loginDetails: {
    time: new Date().toLocaleString(),
    ip: 'N/A', location: 'N/A', device: 'N/A', browser: 'N/A'
  }, mfaCode: code });
};
module.exports = { sendAnomalyAlert, sendMfaCode };
