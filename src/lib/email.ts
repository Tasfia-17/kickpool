import { Resend } from 'resend';

// onboarding@resend.dev is Resend's test address — it can ONLY send to the
// email registered on your Resend account. Set RESEND_FROM_EMAIL to a verified
// sender (e.g. "CinePurr <noreply@yourdomain.com>") to send to any address.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CinePurr <onboarding@resend.dev>';
const APP_NAME = 'CinePurr';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Lazy-initialize Resend client to avoid build-time errors
// Only creates the client when actually needed (at request time)
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  // Only initialize if API key is available
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  
  // Create client lazily (only when first needed)
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  
  return resendClient;
}

// Generate 4-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Generate secure token for password reset
export function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Send verification code email
export async function sendVerificationEmail(email: string, username: string, code: string): Promise<boolean> {
  // Always log the code for development/testing
  console.log(`\n📧 ========== VERIFICATION CODE ==========`);
  console.log(`📧 User: ${username}`);
  console.log(`📧 Email: ${email}`);
  console.log(`📧 ========================================\n`);

  try {
    const resend = getResend();
    
    // If Resend is not configured, still log the code for development
    if (!resend) {
      console.warn('RESEND_API_KEY not set - email not sent, but code logged above');
      return true; // Return true since we logged the code
    }
    
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `🎬 ${APP_NAME} - Your Verification Code: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a1a2e; color: white; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #16213e; border-radius: 20px; padding: 40px; border: 3px solid #e94560; }
            .logo { text-align: center; font-size: 32px; font-weight: bold; color: #e94560; margin-bottom: 20px; }
            .code { background: linear-gradient(135deg, #e94560, #ff6b9d); color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px; text-align: center; margin: 30px 0; font-family: monospace; }
            .message { text-align: center; font-size: 16px; line-height: 1.6; color: #ccc; }
            .username { color: #ff6b9d; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #2d1f3d; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 13px; color: #aaa; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🎬 ${APP_NAME}</div>
            <p class="message">Hey <span class="username">${username}</span>! 👋</p>
            <p class="message">Welcome to ${APP_NAME}! Use this code to verify your email:</p>
            <div class="code">${code}</div>
            <p class="message">This code expires in <strong>10 minutes</strong>.</p>
            <div class="warning">
              ⚠️ If you didn't create an account on ${APP_NAME}, please ignore this email.
            </div>
            <div class="footer">
              © 2025 ${APP_NAME}. Watch together, stay cozy. 🐱
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend failed to send verification email:', JSON.stringify(error));
      console.error('   Tip: If using onboarding@resend.dev you can only send to your Resend account email.');
      console.error('   Set RESEND_FROM_EMAIL to a verified sender domain to send to any address.');
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception sending verification email:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, username: string, resetUrl: string): Promise<boolean> {
  try {
    const resend = getResend();
    
    // If Resend is not configured, return false
    if (!resend) {
      console.error('RESEND_API_KEY not set - cannot send password reset email');
      return false;
    }
    
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `🔐 ${APP_NAME} - Reset Your Password`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a1a2e; color: white; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #16213e; border-radius: 20px; padding: 40px; border: 3px solid #e94560; }
            .logo { text-align: center; font-size: 32px; font-weight: bold; color: #e94560; margin-bottom: 20px; }
            .button { display: block; background: linear-gradient(135deg, #e94560, #ff6b9d); color: white; font-size: 18px; font-weight: bold; padding: 15px 30px; border-radius: 10px; text-align: center; margin: 30px auto; text-decoration: none; max-width: 250px; }
            .button:hover { opacity: 0.9; }
            .message { text-align: center; font-size: 16px; line-height: 1.6; color: #ccc; }
            .username { color: #ff6b9d; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #2d1f3d; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 13px; color: #aaa; }
            .link { word-break: break-all; font-size: 12px; color: #666; margin-top: 15px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🔐 ${APP_NAME}</div>
            <p class="message">Hey <span class="username">${username}</span>! 👋</p>
            <p class="message">We received a request to reset your password. Click the button below to set a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p class="message">This link expires in <strong>1 hour</strong>.</p>
            <div class="warning">
              ⚠️ If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>
            <p class="link">Or copy this link: ${resetUrl}</p>
            <div class="footer">
              © 2025 ${APP_NAME}. Watch together, stay cozy. 🐱
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}
