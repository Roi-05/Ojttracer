const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

const sendPasswordResetEmail = async (to, name, code) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[Email] Gmail credentials not configured — skipping password reset email to:', to);
    return false;
  }

  await transporter.sendMail({
    from: `"OJT Tracker – Pampanga State University" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Password Reset Verification Code - OJT Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1d4ed8; margin: 0 0 6px 0; font-size: 22px;">OJT Tracker</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Pampanga State University – Password Reset</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #374151; font-size: 15px;">Hello <strong>${name || 'User'}</strong>,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">You recently requested to reset your password for your OJT Tracker account. Use the 6-digit verification code below to complete your password reset:</p>
        <div style="background: #f0f7ff; border: 1px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1d4ed8; font-family: monospace;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">This verification code will expire in <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email — your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">This email was sent automatically by the OJT Monitoring System.</p>
      </div>
    `,
  });
  return true;
};

module.exports = {
  createTransporter,
  sendPasswordResetEmail,
};

