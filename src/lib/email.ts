import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'CareCircle <onboarding@resend.dev>';
}

export interface SentEmailRecord {
  id: string;
  to: string;
  from: string;
  subject: string;
  template: string;
  html: string;
  text: string;
  timestamp: string;
  status: 'sent_resend' | 'simulated_dev' | 'failed';
  error?: string;
}

// In-memory outbox for inspection & testing in development
declare global {
  // eslint-disable-next-line no-var
  var __carecircle_email_outbox: SentEmailRecord[] | undefined;
}

const outbox: SentEmailRecord[] = global.__carecircle_email_outbox || [];
if (!global.__carecircle_email_outbox) {
  global.__carecircle_email_outbox = outbox;
}

export function getRecentEmails(limit = 20): SentEmailRecord[] {
  return [...outbox].reverse().slice(0, limit);
}

/**
 * Base email layout matching CareCircle visual style:
 * Cream/Paper background (#f7f3ec), Deep Teal (#2f4a45) branding, Gold (#c98a3a) accents.
 */
function renderCareCircleTemplate({
  title,
  badge,
  contentHtml,
  ctaText,
  ctaUrl,
  secondaryNote
}: {
  title: string;
  badge?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryNote?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f7f3ec;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2b2621;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f7f3ec;
      padding: 40px 16px;
    }
    .main-table {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e7ded0;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(43, 38, 33, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #243b37 0%, #2f4a45 100%);
      padding: 32px 32px 28px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      text-decoration: none;
      font-family: 'Fraunces', Georgia, serif;
    }
    .logo-dot {
      color: #c98a3a;
    }
    .tagline {
      color: #d1dfdc;
      font-size: 13px;
      margin-top: 4px;
    }
    .body-content {
      padding: 36px 32px 28px;
      font-size: 15px;
      line-height: 1.6;
      color: #2b2621;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background-color: #eaf1ef;
      color: #2f4a45;
      margin-bottom: 16px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #2b2621;
      margin: 0 0 16px;
      font-family: 'Fraunces', Georgia, serif;
      line-height: 1.3;
    }
    .btn-container {
      margin: 28px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #2f4a45;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 12px;
      letter-spacing: 0.2px;
    }
    .info-card {
      background-color: #f7f3ec;
      border: 1px solid #e7ded0;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f7f3ec;
      border-top: 1px solid #e7ded0;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #7a7267;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table" cellpadding="0" cellspacing="0" width="100%">
      <!-- Header -->
      <tr>
        <td class="header">
          <div class="logo-text">CareCircle<span class="logo-dot">.</span></div>
          <div class="tagline">Daily AI Care Companion for Aging Parents</div>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td class="body-content">
          ${badge ? `<div class="badge">${badge}</div>` : ''}
          <h1 class="title">${title}</h1>
          ${contentHtml}
          ${
            ctaText && ctaUrl
              ? `
          <div class="btn-container">
            <a href="${ctaUrl}" class="btn" target="_blank" rel="noopener noreferrer">${ctaText}</a>
          </div>
          <p style="font-size: 12px; color: #7a7267; word-break: break-all; margin-top: 12px;">
            If the button above does not work, copy and paste this link into your browser:<br />
            <a href="${ctaUrl}" style="color: #2f4a45;">${ctaUrl}</a>
          </p>
          `
              : ''
          }
          ${
            secondaryNote
              ? `<p style="font-size: 13px; color: #7a7267; margin-top: 24px;">${secondaryNote}</p>`
              : ''
          }
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td class="footer">
          <p style="margin: 0 0 6px;">CareCircle &bull; Bangalore &bull; support@carecircle.in</p>
          <p style="margin: 0; color: #9c9488;">
            Security Notice: CareCircle will never ask for your password via phone or message. If you did not initiate this request, please contact our support team.
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

/**
 * Core send helper: sends via Resend if API key is configured,
 * otherwise logs formatted message to console and saves to outbox.
 */
async function dispatchEmail({
  to,
  subject,
  html,
  text,
  templateName
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  templateName: string;
}): Promise<{ success: boolean; id?: string; error?: string; simulated?: boolean }> {
  const client = getResendClient();
  const senderEmail = getFromEmail();

  if (client && senderEmail.includes('@resend.dev')) {
    // Resend's shared test sender only delivers to the Resend account owner's
    // own address; every other recipient is rejected. Set RESEND_FROM_EMAIL to
    // an address on a domain verified in Resend.
    console.warn(
      `[CareCircle Email] Sending from ${senderEmail}: Resend only delivers this to your own Resend account email. ` +
        'Verify a domain in Resend and set RESEND_FROM_EMAIL to fix delivery to real users.'
    );
  }

  const emailRecord: SentEmailRecord = {
    id: 'eml_' + Math.random().toString(36).substring(2, 10),
    to,
    from: senderEmail,
    subject,
    template: templateName,
    html,
    text,
    timestamp: new Date().toISOString(),
    status: 'simulated_dev'
  };

  console.log(`\n======================================================`);
  console.log(`[CareCircle Email Gateway] Trigger: ${templateName}`);
  console.log(`  To:      ${to}`);
  console.log(`  From:    ${senderEmail}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Preview: ${text.substring(0, 160)}...`);

  if (client) {
    try {
      const response = await client.emails.send({
        from: senderEmail,
        to: [to],
        subject,
        html,
        text
      });

      if (response.error) {
        console.error(`  [Resend API Error]:`, response.error);
        emailRecord.status = 'failed';
        emailRecord.error = response.error.message;
        outbox.push(emailRecord);
        return { success: false, error: response.error.message };
      }

      console.log(`  [Resend API Success] Email Dispatched! ID: ${response.data?.id}`);
      console.log(`======================================================\n`);
      emailRecord.id = response.data?.id || emailRecord.id;
      emailRecord.status = 'sent_resend';
      outbox.push(emailRecord);
      return { success: true, id: response.data?.id };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`  [Resend Exception]:`, errMsg);
      console.log(`======================================================\n`);
      emailRecord.status = 'failed';
      emailRecord.error = errMsg;
      outbox.push(emailRecord);
      return { success: false, error: errMsg };
    }
  } else {
    // Development fallback without Resend key
    console.log(`  [Notice]: RESEND_API_KEY is not set in environment.`);
    console.log(`  Email recorded in dev outbox (Mock Delivered).`);
    console.log(`======================================================\n`);
    emailRecord.status = 'simulated_dev';
    outbox.push(emailRecord);
    return { success: true, id: emailRecord.id, simulated: true };
  }
}

// --------------------------------------------------------------------------
// 1. PASSWORD RESET EMAIL
// --------------------------------------------------------------------------
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresInMinutes = 20
}: {
  to: string;
  name?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}) {
  const recipientName = name ? name.split(' ')[0] : 'there';
  const title = 'Reset your CareCircle password';
  const contentHtml = `
    <p>Hi ${recipientName},</p>
    <p>We received a request to reset the password for your CareCircle account associated with <strong>${to}</strong>.</p>
    <p>Click the button below to choose a new password. For your security, this single-use link will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
  `;
  const html = renderCareCircleTemplate({
    title,
    badge: 'Security Request',
    contentHtml,
    ctaText: 'Reset My Password',
    ctaUrl: resetUrl,
    secondaryNote: `If you didn't request a password reset, you can safely ignore this email. Your current password remains secure.`
  });
  const text = `Hi ${recipientName},\n\nWe received a request to reset your CareCircle password. Use the following link within ${expiresInMinutes} minutes to choose a new password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

  return dispatchEmail({
    to,
    subject: 'Reset your CareCircle password',
    html,
    text,
    templateName: 'password_reset'
  });
}

// --------------------------------------------------------------------------
// 2. EMAIL VERIFICATION / WELCOME EMAIL
// --------------------------------------------------------------------------
export async function sendVerificationEmail({
  to,
  name,
  verifyUrl
}: {
  to: string;
  name?: string;
  verifyUrl: string;
}) {
  const recipientName = name ? name.split(' ')[0] : 'there';
  const title = 'Welcome to CareCircle! Please verify your email';
  const contentHtml = `
    <p>Hi ${recipientName},</p>
    <p>Thank you for joining CareCircle. We are honored to help you look after your parents with caring, daily AI check-ins.</p>
    <p>Please verify your email address to secure your account and activate your family notifications.</p>
  `;
  const html = renderCareCircleTemplate({
    title,
    badge: 'Welcome to CareCircle',
    contentHtml,
    ctaText: 'Verify My Email',
    ctaUrl: verifyUrl,
    secondaryNote: 'After verifying, you will be directed straight to parent routine setup.'
  });
  const text = `Hi ${recipientName},\n\nWelcome to CareCircle! Please verify your email by clicking the link below:\n\n${verifyUrl}`;

  return dispatchEmail({
    to,
    subject: 'Welcome to CareCircle — Please verify your email',
    html,
    text,
    templateName: 'email_verification'
  });
}

// --------------------------------------------------------------------------
// 3. OTP VERIFICATION CODE (BACKUP VIA EMAIL)
// --------------------------------------------------------------------------
export async function sendOtpEmail({
  to,
  name,
  code,
  expiresInMinutes = 10
}: {
  to: string;
  name?: string;
  code: string;
  expiresInMinutes?: number;
}) {
  const recipientName = name ? name.split(' ')[0] : 'there';
  const title = 'Your CareCircle Verification Code';
  const contentHtml = `
    <p>Hi ${recipientName},</p>
    <p>Here is your one-time verification code to sign in to CareCircle:</p>
    <div style="background-color: #f7f3ec; border: 2px dashed #2f4a45; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2f4a45; font-family: monospace;">${code}</span>
    </div>
    <p style="font-size: 13px; color: #7a7267;">This code is valid for <strong>${expiresInMinutes} minutes</strong>. Do not share this code with anyone.</p>
  `;
  const html = renderCareCircleTemplate({
    title,
    badge: 'Security Code',
    contentHtml,
    secondaryNote: `If you didn't request this code, someone may have entered your email address by mistake.`
  });
  const text = `Hi ${recipientName},\n\nYour CareCircle verification code is: ${code}\n\nIt expires in ${expiresInMinutes} minutes.`;

  return dispatchEmail({
    to,
    subject: `${code} is your CareCircle verification code`,
    html,
    text,
    templateName: 'otp_code'
  });
}

// --------------------------------------------------------------------------
// 4. PAYMENT RECEIPT / CONFIRMATION EMAIL
// --------------------------------------------------------------------------
export async function sendPaymentReceiptEmail({
  to,
  name,
  planName,
  amount,
  invoiceNumber,
  date,
  nextBillingDate,
  paymentMethod = 'UPI AutoPay'
}: {
  to: string;
  name?: string;
  planName: string;
  amount: number;
  invoiceNumber: string;
  date: string;
  nextBillingDate?: string;
  paymentMethod?: string;
}) {
  const recipientName = name ? name.split(' ')[0] : 'there';
  const title = 'Payment Confirmation & Receipt';
  const contentHtml = `
    <p>Hi ${recipientName},</p>
    <p>Thank you for subscribing to CareCircle. Your subscription payment has been processed successfully.</p>
    <div class="info-card">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #7a7267;">Invoice Number:</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7a7267;">Plan:</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${planName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7a7267;">Amount Paid:</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #2f4a45;">₹${amount}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7a7267;">Payment Method:</td>
          <td style="padding: 6px 0; text-align: right;">${paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7a7267;">Date:</td>
          <td style="padding: 6px 0; text-align: right;">${date}</td>
        </tr>
        ${
          nextBillingDate
            ? `
        <tr>
          <td style="padding: 6px 0; color: #7a7267;">Next Renewal:</td>
          <td style="padding: 6px 0; text-align: right;">${nextBillingDate}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>
    <p>Your parents' daily calls, medicine reminders, and family health summaries are actively configured.</p>
  `;
  const html = renderCareCircleTemplate({
    title,
    badge: 'Receipt & Subscription Active',
    contentHtml,
    ctaText: 'View Dashboard & Billing',
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account/billing`,
    secondaryNote: 'You can download tax invoices or update payment methods anytime from your Account settings.'
  });
  const text = `Hi ${recipientName},\n\nPayment Receipt from CareCircle\nInvoice: ${invoiceNumber}\nPlan: ${planName}\nAmount: ₹${amount}\nDate: ${date}\n\nThank you for choosing CareCircle.`;

  return dispatchEmail({
    to,
    subject: `Receipt for your CareCircle subscription (${invoiceNumber})`,
    html,
    text,
    templateName: 'payment_receipt'
  });
}

// --------------------------------------------------------------------------
// 5. PAYMENT FAILED NOTIFICATION
// --------------------------------------------------------------------------
export async function sendPaymentFailedEmail({
  to,
  name,
  planName,
  amount,
  retryUrl
}: {
  to: string;
  name?: string;
  planName: string;
  amount: number;
  retryUrl: string;
}) {
  const recipientName = name ? name.split(' ')[0] : 'there';
  const title = 'Payment Issue with Your CareCircle Subscription';
  const contentHtml = `
    <p>Hi ${recipientName},</p>
    <p>We were unable to process your recurring subscription payment of <strong>₹${amount}</strong> for the <strong>${planName}</strong> plan.</p>
    <p>To avoid any interruption in your parents' daily check-in calls and medication alerts, please update your payment method or retry the charge using the button below.</p>
  `;
  const html = renderCareCircleTemplate({
    title,
    badge: 'Payment Action Required',
    contentHtml,
    ctaText: 'Update Payment Method',
    ctaUrl: retryUrl,
    secondaryNote: 'We will retry the payment in 48 hours. Your care services remain active during this grace period.'
  });
  const text = `Hi ${recipientName},\n\nYour CareCircle payment of ₹${amount} could not be processed. Please update your payment method to ensure uninterrupted service:\n\n${retryUrl}`;

  return dispatchEmail({
    to,
    subject: 'Action Required: CareCircle subscription payment failed',
    html,
    text,
    templateName: 'payment_failed'
  });
}

// --------------------------------------------------------------------------
// 6. SUBSCRIPTION CANCELLED EMAIL
// --------------------------------------------------------------------------
export async function sendSubscriptionCancelledEmail({
  to,
  name,
  planName,
  accessUntil
}: {
  to: string;
  name?: string;
  planName: string;
  accessUntil: string;
}) {
  const recipientName = name ? name.split(' ')[0] : 'there';
  const title = 'Your CareCircle subscription has been cancelled';
  const contentHtml = `
    <p>Hi ${recipientName},</p>
    <p>As requested, your subscription to <strong>${planName}</strong> has been cancelled.</p>
    <p>You will retain full access to your parents' daily calls, reports, and AI logs until the end of your billing cycle on <strong>${accessUntil}</strong>.</p>
    <p>Your configured parent preferences and history will be safely preserved in your account if you choose to reactivate in the future.</p>
  `;
  const html = renderCareCircleTemplate({
    title,
    badge: 'Subscription Update',
    contentHtml,
    ctaText: 'Reactivate Subscription Anytime',
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account/billing`,
    secondaryNote: 'Thank you for allowing CareCircle to be a part of your family care circle.'
  });
  const text = `Hi ${recipientName},\n\nYour CareCircle subscription to ${planName} has been cancelled. You have access until ${accessUntil}.`;

  return dispatchEmail({
    to,
    subject: 'CareCircle subscription cancellation confirmed',
    html,
    text,
    templateName: 'subscription_cancelled'
  });
}

// --------------------------------------------------------------------------
// 7. URGENT LEVEL 2+ HEALTH ALERT NOTIFICATION
// --------------------------------------------------------------------------
export async function sendUrgentAlertEmail({
  to,
  name,
  parentName,
  alertLevel,
  alertType,
  summary,
  actionUrl
}: {
  to: string;
  name?: string;
  parentName: string;
  alertLevel: 'level_1' | 'level_2' | 'level_3';
  alertType: string;
  summary: string;
  actionUrl: string;
}) {
  const recipientName = name ? name.split(' ')[0] : 'there';
  const levelLabel = alertLevel === 'level_3' ? 'CRITICAL ALERT' : 'IMPORTANT HEALTH UPDATE';
  const title = `${levelLabel}: ${parentName}`;
  const contentHtml = `
    <p>Hi ${recipientName},</p>
    <p>CareCircle's AI companion detected a health update during the latest check-in call with <strong>${parentName}</strong>.</p>
    <div class="info-card" style="border-left: 4px solid #ef4444;">
      <div style="font-weight: 700; color: #b91c1c; margin-bottom: 6px;">${alertType}</div>
      <p style="margin: 0; font-size: 14px; color: #2b2621;">${summary}</p>
    </div>
    <p>Please review the full call transcript and verify that your parent is resting comfortably.</p>
  `;
  const html = renderCareCircleTemplate({
    title,
    badge: levelLabel,
    contentHtml,
    ctaText: 'Review Call Transcript & Alert',
    ctaUrl: actionUrl,
    secondaryNote: 'If this is an emergency, please contact your parent or their primary doctor immediately.'
  });
  const text = `[${levelLabel}] ${parentName}\n\nType: ${alertType}\nSummary: ${summary}\n\nReview now: ${actionUrl}`;

  return dispatchEmail({
    to,
    subject: `🚨 [${levelLabel}] ${parentName} — ${alertType}`,
    html,
    text,
    templateName: 'urgent_alert'
  });
}
