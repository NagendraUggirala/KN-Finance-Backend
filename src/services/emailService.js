import nodemailer from 'nodemailer';

/**
 * Creates and returns a configured Nodemailer transporter
 */
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
};

/**
 * Sends a branded KN Finance Password Reset OTP email
 *
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit verification code
 * @param {number} expiryMinutes - Expiration time in minutes (default 10)
 * @returns {Promise<{ sent: boolean, messageId?: string }>}
 */
export const sendPasswordResetEmail = async (to, otp, expiryMinutes = 10) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KN Finance - Password Reset Verification</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #166534 0%, #14532d 100%); padding: 32px 24px; text-align: center; }
        .logo-badge { display: inline-block; background-color: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px; }
        .logo-text { color: #D4A017; font-weight: 800; font-size: 24px; letter-spacing: 1px; margin: 0; }
        .header h1 { color: #ffffff; font-size: 20px; font-weight: 700; margin: 8px 0 0 0; }
        .content { padding: 32px 28px; color: #1e293b; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #166534; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 8px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin: 0; }
        .expiry-notice { font-size: 12px; color: #64748B; margin-top: 8px; }
        .warning-card { background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 16px; margin: 24px 0; }
        .warning-card p { margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5; }
        .warning-title { font-weight: 700; margin-bottom: 4px; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-badge">
            <span class="logo-text">KN</span>
          </div>
          <h1>KN Finance Portal</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello Admin,</div>
          <p class="message">
            We received a request to reset the password for your KN Finance Administrator account.
            Please use the following One-Time Password (OTP) to proceed with your password reset:
          </p>
          <div class="otp-box">
            <div class="otp-label">Verification Code (OTP)</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry-notice">⏱️ This code will expire in <strong>${expiryMinutes} minutes</strong>.</div>
          </div>
          <div class="warning-card">
            <div class="warning-title">🔒 Security Notice</div>
            <p>
              Never share this verification code with anyone. KN Finance administrators and employees
              will <strong>never</strong> ask for your OTP. If you did not request this password reset,
              please ignore this email or contact security immediately.
            </p>
          </div>
          <p class="message" style="margin-bottom: 0;">
            Thank you,<br>
            <strong>KN Finance Security & Operations Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>KN Finance • Next-Gen Wealth & Portfolio Management</p>
          <p>This is an automated system notification. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
KN Finance - Password Reset Verification Code

Your One-Time Password (OTP) is: ${otp}

This code is valid for ${expiryMinutes} minutes.

SECURITY NOTICE:
Never share this code with anyone. KN Finance representatives will never ask for your verification code.
If you did not request a password reset, please ignore this email.
  `;

  if (!transporter) {
    console.log(`ℹ️ [EmailService] SMTP credentials not set. Simulated email dispatch to ${to}: OTP = ${otp}`);
    return { sent: false, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"KN Finance Security" <${process.env.EMAIL_USER}>`,
      to,
      subject: `KN Finance Password Reset Code: ${otp}`,
      text: textContent,
      html: htmlContent
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [EmailService] Failed to send email via SMTP:', error.message);
    // Don't crash the request; return sent: false so controller can handle appropriately
    return { sent: false, error: error.message };
  }
};
