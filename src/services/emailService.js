import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let cachedTransporter = null;

/**
 * Creates and returns a configured persistent Nodemailer transporter with connection pooling
 */
export const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD; // Supports Google App Password (16 characters)

  if (!user || !pass) {
    return null;
  }

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10);
  const isCustomHost = host && host !== 'smtp.gmail.com';

  const transportConfig = {
    auth: {
      user,
      pass
    },
    pool: true,              // Use persistent connection pool
    maxConnections: 3,       // Max concurrent connections
    connectionTimeout: 8000, // Fail fast if Gmail throttles connection (8s)
    socketTimeout: 10000     // 10s socket timeout
  };

  if (isCustomHost) {
    transportConfig.host = host;
    transportConfig.port = port || 587;
    transportConfig.secure = transportConfig.port === 465;
  } else {
    // Standard Gmail configuration for cloud platforms (Render, etc.)
    transportConfig.service = 'gmail';
  }

  cachedTransporter = nodemailer.createTransport(transportConfig);

  // Verify transporter once on server start / module initialization
  cachedTransporter.verify((err, success) => {
    if (err) {
      console.error('[SMTP Config Error]:', err.message || err);
    } else {
      console.log('[SMTP Config]: Email transporter ready.');
    }
  });

  return cachedTransporter;
};

// Singleton transporter instance
export const transporter = getTransporter();

/**
 * Sends a branded KN Finance Password Reset OTP email
 *
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit verification code
 * @param {number} expiryMinutes - Expiration time in minutes (default 10)
 * @returns {Promise<{ sent: boolean, messageId?: string, error?: string }>}
 */
export const sendPasswordResetEmail = async (to, otp, expiryMinutes = 10) => {
  const mailTransporter = getTransporter();

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

  if (!mailTransporter) {
    console.log(`ℹ️ [EmailService] SMTP credentials not set. Simulated email dispatch to ${to}: OTP = ${otp}`);
    return { sent: false, simulated: true };
  }

  try {
    const info = await mailTransporter.sendMail({
      from: `"KN Finance Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'KN Finance - Password Reset Verification OTP',
      text: textContent,
      html: htmlContent
    });

    console.log(`[Email Sent]: OTP dispatched to ${to} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Failed]: Could not send OTP to ${to}:`, error.message);
    // Don't crash the request; return sent: false so controller can handle appropriately
    return { sent: false, error: error.message };
  }
};

/**
 * Sends a high-priority branded Notification email to one or multiple recipients
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email or array of emails
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message body
 * @param {string} [options.severity='Info'] - Severity level ('Info', 'Success', 'Warning', 'Critical', 'Expiry')
 * @param {string} [options.actionLink] - Optional URL / deep-link
 * @param {string} [options.senderName='Super Admin'] - Dispatcher display name
 * @param {string} [options.expiryDate] - Expiration date if applicable
 * @returns {Promise<{ sent: boolean, simulated?: boolean, messageId?: string, error?: string }>}
 */
export const sendNotificationEmail = async ({
  to,
  title,
  message,
  severity = 'Info',
  actionLink = null,
  senderName = 'Super Admin',
  expiryDate = null
}) => {
  const mailTransporter = getTransporter();

  // Normalize recipients
  const recipientsList = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipientsList.length === 0) {
    return { sent: false, error: 'No recipient email addresses provided' };
  }

  // Severity styling configuration
  const severityConfigs = {
    Info: {
      color: '#2563eb',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
      badge: 'ℹ️ INFO NOTICE'
    },
    Success: {
      color: '#16a34a',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      badge: '✅ SYSTEM UPDATE'
    },
    Warning: {
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      badge: '⚠️ ATTENTION REQUIRED'
    },
    Critical: {
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      badge: '🚨 CRITICAL ALERT'
    },
    Expiry: {
      color: '#7c3aed',
      bgColor: '#faf5ff',
      borderColor: '#e9d5ff',
      badge: '⏳ LICENSE EXPIRATION'
    }
  };

  const currentConfig = severityConfigs[severity] || severityConfigs.Info;

  // Format message lines into HTML paragraphs or breaks
  const formattedHtmlMessage = message
    .split('\n')
    .map(paragraph => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${paragraph.trim()}</p>`)
    .join('');

  const expiryHtml = expiryDate
    ? `
      <div style="margin: 16px 0; padding: 12px 16px; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; color: #92400e; font-size: 13px; font-weight: 600;">
        📅 Scheduled Expiry / Deadline: <strong>${expiryDate}</strong>
      </div>
    `
    : '';

  const actionButtonHtml = actionLink
    ? `
      <div style="text-align: center; margin: 32px 0 20px 0;">
        <a href="${actionLink}" target="_blank" style="background-color: #166534; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(22, 101, 52, 0.2);">
          Open Dashboard / Action Link →
        </a>
      </div>
    `
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - KN Finance</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #166534 0%, #14532d 100%); padding: 28px 24px; text-align: center; }
        .logo-badge { display: inline-block; background-color: rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 6px 14px; margin-bottom: 8px; }
        .logo-text { color: #D4A017; font-weight: 800; font-size: 22px; letter-spacing: 1px; margin: 0; }
        .header h1 { color: #ffffff; font-size: 18px; font-weight: 600; margin: 4px 0 0 0; }
        .content { padding: 32px 28px; color: #1e293b; }
        .severity-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
        .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3; }
        .message-body { font-size: 14px; color: #334155; margin-bottom: 24px; }
        .meta-box { background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px 18px; font-size: 12px; color: #64748b; margin-top: 24px; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-badge">
            <span class="logo-text">KN</span>
          </div>
          <h1>KN Finance Management Portal</h1>
        </div>
        <div class="content">
          <div class="severity-badge" style="background-color: ${currentConfig.bgColor}; color: ${currentConfig.color}; border: 1px solid ${currentConfig.borderColor};">
            ${currentConfig.badge}
          </div>
          <h2 class="title">${title}</h2>
          <div class="message-body">
            ${formattedHtmlMessage}
          </div>
          ${expiryHtml}
          ${actionButtonHtml}
          <div class="meta-box">
            <div><strong>Dispatched By:</strong> ${senderName}</div>
            <div style="margin-top: 4px;"><strong>Sent:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</div>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0 0 4px 0;">KN Finance • Next-Gen Wealth & Portfolio Management</p>
          <p style="margin: 0;">This administrative alert was sent to branch operations. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
[KN Finance Management Notice - ${severity.toUpperCase()}]
${title}

${message}

${expiryDate ? `Scheduled Expiry: ${expiryDate}\n` : ''}${actionLink ? `Action Link: ${actionLink}\n` : ''}
Dispatched by: ${senderName}
Date: ${new Date().toISOString()}
  `.trim();

  // If no SMTP configured, log simulated delivery
  if (!mailTransporter) {
    console.log(
      `ℹ️ [EmailService] SMTP credentials not set. Simulated notification email to [${recipientsList.join(', ')}] with title: "${title}"`
    );
    return { sent: true, simulated: true, recipientCount: recipientsList.length };
  }

  try {
    const toField = recipientsList.length === 1 ? recipientsList[0] : process.env.EMAIL_USER || 'admin@knfinance.com';
    const bccField = recipientsList.length > 1 ? recipientsList : undefined;

    const info = await mailTransporter.sendMail({
      from: `"KN Finance Alert" <${process.env.EMAIL_USER}>`,
      to: toField,
      bcc: bccField,
      subject: `[KN Finance - ${severity}] ${title}`,
      text: textContent,
      html: htmlContent
    });

    console.log(`✅ [EmailService] Notification email sent successfully to ${recipientsList.length} recipient(s):`, info.messageId);
    return { sent: true, messageId: info.messageId, recipientCount: recipientsList.length };
  } catch (error) {
    console.error('❌ [EmailService] Failed to send notification email:', error.message);
    return { sent: false, error: error.message, recipientCount: recipientsList.length };
  }
};
