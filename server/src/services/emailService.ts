// ============================================================================
// DispatchGrid — Email Dispatch Service (Nodemailer)
// Delivers real verification OTP and welcome emails to user Gmail/inbox.
//
// Supports:
//   1. Gmail SMTP via GMAIL_USER + GMAIL_APP_PASSWORD
//   2. Custom SMTP via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
//   3. Auto-fallback logging to server console if SMTP credentials not yet provided
// ============================================================================

import nodemailer from 'nodemailer';

interface SendOtpOptions {
  to: string;
  otp: string;
  type: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';
}

interface SendWelcomeEmailOptions {
  to: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface DispatchedEmailRecord {
  id: string;
  type: 'OTP' | 'WELCOME' | 'ASSIGNMENT' | 'TECH_JOB_OFFER';
  to: string;
  subject: string;
  preview: string;
  sentAt: string;
  pin?: string;
  techName?: string;
  customerName?: string;
  address?: string;
  scheduledArrival?: string;
  distanceKm?: number;
}

const recentEmails: DispatchedEmailRecord[] = [];

export function recordSentEmail(record: DispatchedEmailRecord) {
  recentEmails.unshift(record);
  if (recentEmails.length > 50) recentEmails.pop();
}

export function getRecentSentEmails(): DispatchedEmailRecord[] {
  return recentEmails;
}

export async function sendRealEmailOtp({ to, otp, type }: SendOtpOptions): Promise<{ delivered: boolean; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  const actionTitle =
    type === 'RESET_PASSWORD'
      ? 'Password Reset Request'
      : type === 'REGISTER'
      ? 'Customer Registration & Activation'
      : 'Customer Portal Sign In';

  // If Gmail or SMTP credentials are configured in .env, send the live email
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''),
        },
      });

      const mailOptions: any = {
        from: `"DispatchGrid Support" <${gmailUser}>`,
        to,
        subject: `[DispatchGrid] ${otp} is your verification code for ${actionTitle}`,
        text: `Your DispatchGrid verification PIN is: ${otp}\n\nThis code will expire in 3 minutes.\nIf you did not request this code, please ignore this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #0f172a; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
            <div style="background: #522959; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DispatchGrid</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">Enterprise Workforce Scheduling & Dispatch Verification</p>
            </div>
            
            <div style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px 0; color: #180018; font-size: 18px; font-weight: 700;">${actionTitle}</h2>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Please enter the following 6-digit security PIN into the customer portal to verify your account:
              </p>
              
              <div style="background: #faf5ff; border: 1.5px solid #d8b4fe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #522959; display: inline-block;">
                  ${otp}
                </span>
                <div style="margin-top: 8px; font-size: 11px; color: #f59e0b; font-family: monospace;">
                  Valid for exactly 3 minutes
                </div>
              </div>
              
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; line-height: 1.4;">
                This PIN was requested for <strong>${to}</strong>. Never share this code with anyone.
              </p>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.4;">
                If you did not make this request, you can safely ignore this message.
              </p>
            </div>
            
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 11px;">
                (c) 2026 DispatchGrid On-Demand Technologies • Automated Security Dispatch
              </p>
            </div>
          </div>
        `,
      };

      if (gmailUser && to.toLowerCase() !== gmailUser.toLowerCase()) {
        mailOptions.bcc = gmailUser;
      }

      await transporter.sendMail(mailOptions);
      recordSentEmail({
        id: `otp-${Date.now()}`,
        type: 'OTP',
        to,
        subject: mailOptions.subject,
        pin: otp,
        preview: `Your DispatchGrid verification PIN is: ${otp}. Valid for 3 minutes.`,
        sentAt: new Date().toISOString(),
      });
      console.log(`\n======================================================`);
      console.log(`[REAL EMAIL DELIVERED TO GMAIL]`);
      console.log(`   To: ${to}`);
      console.log(`   Subject: [DispatchGrid] ${otp} is your verification code`);
      console.log(`   Dispatched via: ${gmailUser}`);
      console.log(`======================================================\n`);
      return { delivered: true };
    } catch (err: any) {
      console.error(`[SMTP ERROR]: Failed to send to ${to}:`, err.message);
      return { delivered: false, error: err.message };
    }
  }

  // Fallback: If user has not yet entered GMAIL_USER/GMAIL_APP_PASSWORD in server/.env
  console.log(`\n======================================================`);
  console.log(`[EMAIL DISPATCHED TO: ${to}]`);
  console.log(`   SECURITY OTP PIN: ${otp}`);
  console.log(`   ACTION: ${type}`);
  console.log(`   VALIDITY: 3 MINUTES`);
  console.log(`------------------------------------------------------`);
  console.log(`[INFO] TO DELIVER DIRECTLY TO REAL GMAIL INBOXES:`);
  console.log(`   Add these two lines to server/.env:`);
  console.log(`   GMAIL_USER=your_email@gmail.com`);
  console.log(`   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx`);
  console.log(`======================================================\n`);

  return { delivered: false, error: 'NO_SMTP_CREDENTIALS_IN_ENV' };
}

export async function sendWelcomeEmail({ to, name, address, phone }: SendWelcomeEmailOptions): Promise<{ delivered: boolean; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''),
        },
      });

      const mailOptions: any = {
        from: `"DispatchGrid Support" <${gmailUser}>`,
        to,
        subject: `[DispatchGrid] Welcome ${name} - Your Customer Profile is Ready`,
        text: `Welcome to DispatchGrid, ${name}!\n\nYour profile has been created and verified successfully.\n\nAccount Details:\n- Name: ${name}\n- Email: ${to}\n- Phone: ${phone || 'N/A'}\n- Service Location: ${address || 'Bengaluru, India'}\n\nYou can now request verified trade specialists on-demand with live radar tracking and PIN handoff.\n\nThank you for choosing DispatchGrid.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #0f172a; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
            <div style="background: #522959; padding: 26px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DispatchGrid</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Certified Emergency Trade Specialists</p>
            </div>
            
            <div style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px 0; color: #180018; font-size: 18px; font-weight: 700;">Account Created Successfully</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Hello <strong>${name}</strong>, your DispatchGrid customer account is now verified and active. You can immediately access verified plumbers, electricians, HVAC mechanics, appliance technicians, and locksmiths on demand.
              </p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #522959; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
                  Profile Summary
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 140px;">Registered Name:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Registered Email:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${to}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Primary Contact:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${phone || 'Not Specified'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Default Address:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${address || 'Bengaluru, India'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Account Status:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #10b981;">Verified Active</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px;">Service Assurance Highlights:</div>
                <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                  • 4-Digit Secure Arrival PIN verification at your doorstep<br />
                  • Live transit radar and ETA tracking<br />
                  • Dynamic real-time schedule conflict protection<br />
                  • Itemized transparent invoicing with digital warranty
                </div>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.4;">
                If you did not register this account, please reply immediately to this email.
              </p>
            </div>
            
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 11px;">
                (c) 2026 DispatchGrid On-Demand Technologies • Automated Customer Service
              </p>
            </div>
          </div>
        `,
      };

      if (gmailUser && to.toLowerCase() !== gmailUser.toLowerCase()) {
        mailOptions.bcc = gmailUser;
      }

      await transporter.sendMail(mailOptions);
      recordSentEmail({
        id: `welcome-${Date.now()}`,
        type: 'WELCOME',
        to,
        subject: mailOptions.subject,
        customerName: name,
        preview: `Welcome to DispatchGrid, ${name}! Your profile has been created and verified successfully.`,
        sentAt: new Date().toISOString(),
      });
      console.log(`\n======================================================`);
      console.log(`[WELCOME EMAIL DELIVERED TO GMAIL]`);
      console.log(`   To: ${to}`);
      console.log(`   Name: ${name}`);
      console.log(`   Subject: [DispatchGrid] Welcome ${name} - Your Customer Profile is Ready`);
      console.log(`   Dispatched via: ${gmailUser}`);
      console.log(`======================================================\n`);
      return { delivered: true };
    } catch (err: any) {
      console.error(`[SMTP ERROR]: Failed to send welcome email to ${to}:`, err.message);
      return { delivered: false, error: err.message };
    }
  }

  // Fallback console log
  console.log(`\n======================================================`);
  console.log(`[WELCOME EMAIL DISPATCHED TO: ${to}]`);
  console.log(`   Customer Name: ${name}`);
  console.log(`   Status: Profile Created Successfully`);
  console.log(`======================================================\n`);

  return { delivered: false, error: 'NO_SMTP_CREDENTIALS_IN_ENV' };
}

export interface SendAssignmentEmailOptions {
  to: string;
  customerName: string;
  techName: string;
  techPhone?: string;
  jobTitle: string;
  serviceZone: string;
  pin: string;
  totalAmount?: number;
  scheduledArrival?: string;
  customerAddress?: string;
  distanceKm?: number;
}

export async function sendAssignmentEmail({
  to,
  customerName,
  techName,
  techPhone,
  jobTitle,
  serviceZone,
  pin,
  totalAmount,
  scheduledArrival,
  customerAddress,
  distanceKm,
}: SendAssignmentEmailOptions): Promise<{ delivered: boolean; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  const arrivalText = scheduledArrival ? `Coming by ${scheduledArrival}` : 'En route to your location';
  const addressText = customerAddress || serviceZone;
  const distText = distanceKm !== undefined ? `(${distanceKm.toFixed(1)} km from worksite)` : '';

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''),
        },
      });

      const mailOptions: any = {
        from: `"DispatchGrid Fleet" <${gmailUser}>`,
        to,
        subject: `[DispatchGrid] Captain ${techName} is coming by ${scheduledArrival || 'soon'} (${jobTitle})`,
        text: `Hello ${customerName},\n\nGreat news! Captain ${techName} has been assigned to your order: "${jobTitle}".\n\nScheduled Arrival: Captain ${techName} is coming by ${scheduledArrival || '30-45 minutes'} to ${addressText} ${distText}.\n\nYour Doorstep Security PIN is: ${pin}\n\nPlease share this 4-digit PIN with Captain ${techName} upon arrival to authorize work.\n\nTechnician Details:\n- Name: Captain ${techName}\n- Contact: ${techPhone || '+91 98450 12345'}\n- Service Zone: ${serviceZone}\n${totalAmount ? `- Total Fare: ₹${totalAmount}\n` : ''}\nThank you for choosing DispatchGrid!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #0f172a; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
            <div style="background: #522959; padding: 26px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DispatchGrid</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Verified On-Demand Fleet Network</p>
            </div>
            
            <div style="padding: 32px 28px;">
              <div style="display: inline-block; background: #042f2e; border: 1px solid #0d9488; color: #2dd4bf; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                Specialist Dispatched & Scheduled
              </div>
              <h2 style="margin: 0 0 8px 0; color: #180018; font-size: 20px; font-weight: 800;">Captain ${techName} is coming by ${scheduledArrival || 'soon'}!</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Hello <strong>${customerName}</strong>, your request for <strong>${jobTitle}</strong> has been assigned to Captain ${techName}.
              </p>

              <!-- Arrival Schedule Banner -->
              <div style="background: #ecfdf5; border: 1.5px solid #059669; border-radius: 12px; padding: 16px 20px; margin-bottom: 22px; text-align: center;">
                <div style="font-size: 11px; font-weight: 800; color: #6ee7b7; text-transform: uppercase; letter-spacing: 1px;">
                  Confirmed Arrival Schedule
                </div>
                <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 4px 0;">
                  Arriving by ${scheduledArrival || '30-45 minutes'}
                </div>
                <div style="font-size: 12px; color: #a7f3d0;">
                  Destination: ${addressText} ${distText}
                </div>
              </div>
              
              <!-- Doorstep PIN Card -->
              <div style="background: #faf5ff; border: 2px solid #a855f7; border-radius: 14px; padding: 22px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; color: #c7d2fe; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                  Your Doorstep Start PIN
                </div>
                <div style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #522959; margin: 4px 0;">
                  ${pin}
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
                  Please share this 4-digit code with Captain ${techName} when they arrive at your door to start work.
                </div>
              </div>

              <!-- Specialist & Order Details -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #522959; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
                  Dispatch Summary
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 140px;">Assigned Specialist:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #ffffff;">Captain ${techName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Specialist Contact:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${techPhone || '+91 98450 12345'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Service Requested:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${jobTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Delivery Address:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${addressText}</td>
                  </tr>
                  ${distanceKm !== undefined ? `
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">GPS Distance:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #522959;">${distanceKm.toFixed(1)} km away</td>
                  </tr>
                  ` : ''}
                  ${totalAmount ? `
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Estimated Bill:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #10b981;">₹${totalAmount}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.4;">
                Need assistance? Open your DispatchGrid Customer Portal at any time.
              </p>
            </div>
            
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 11px;">
                (c) 2026 DispatchGrid On-Demand Technologies • Automated Dispatch Confirmation
              </p>
            </div>
          </div>
        `,
      };

      if (gmailUser && to.toLowerCase() !== gmailUser.toLowerCase()) {
        mailOptions.bcc = gmailUser;
      }

      await transporter.sendMail(mailOptions);
      recordSentEmail({
        id: `assign-${Date.now()}`,
        type: 'ASSIGNMENT',
        to,
        subject: mailOptions.subject,
        preview: `Captain ${techName} scheduled to arrive by ${scheduledArrival || 'soon'} at ${addressText}. Doorstep PIN: ${pin}`,
        sentAt: new Date().toISOString(),
        pin,
        techName,
        customerName,
        address: addressText,
        scheduledArrival,
        distanceKm,
      });
      console.log(`\n======================================================`);
      console.log(`[ASSIGNMENT EMAIL DELIVERED TO GMAIL]`);
      console.log(`   To: ${to}`);
      console.log(`   Captain: ${techName}`);
      console.log(`   Arrival Time: ${scheduledArrival || 'En route'}`);
      console.log(`   Distance: ${distanceKm ? distanceKm.toFixed(1) + ' km' : 'N/A'}`);
      console.log(`   PIN: ${pin}`);
      console.log(`   Dispatched via: ${gmailUser}`);
      console.log(`======================================================\n`);
      return { delivered: true };
    } catch (err: any) {
      console.error(`[SMTP ERROR]: Failed to send assignment email to ${to}:`, err.message);
      return { delivered: false, error: err.message };
    }
  }

  // Fallback console log
  console.log(`\n======================================================`);
  console.log(`[ASSIGNMENT EMAIL DISPATCHED TO: ${to}]`);
  console.log(`   Customer: ${customerName}`);
  console.log(`   Captain: ${techName}`);
  console.log(`   Arrival Time: ${scheduledArrival || 'Soon'}`);
  console.log(`   PIN: ${pin}`);
  console.log(`   Job: ${jobTitle}`);
  console.log(`======================================================\n`);

  return { delivered: false, error: 'NO_SMTP_CREDENTIALS_IN_ENV' };
}

export interface SendTechnicianJobNotificationOptions {
  to: string;
  techName: string;
  jobTitle: string;
  customerName: string;
  customerAddress: string;
  serviceZone: string;
  distanceKm: number;
  scheduledArrival: string;
  payout?: number;
  jobId: string;
  portalUrl?: string;
}

export async function sendTechnicianJobNotificationEmail({
  to,
  techName,
  jobTitle,
  customerName,
  customerAddress,
  serviceZone,
  distanceKm,
  scheduledArrival,
  payout = 1050,
  jobId,
  portalUrl = 'http://172.16.25.82:5173/technician',
}: SendTechnicianJobNotificationOptions): Promise<{ delivered: boolean; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customerAddress + ', Bengaluru')}`;

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''),
        },
      });

      const mailOptions: any = {
        from: `"DispatchGrid Operations" <${gmailUser}>`,
        to,
        subject: `[DispatchGrid Partner Alert] New Job Available in ${serviceZone} (${distanceKm.toFixed(1)} km away)`,
        text: `Hello Captain ${techName},\n\nA new urgent service job is available for you!\n\nJob: ${jobTitle}\nCustomer: ${customerName}\nWorksite Address: ${customerAddress} (${serviceZone})\nDistance from your location: ${distanceKm.toFixed(1)} km\nExpected Arrival by: ${scheduledArrival}\nEstimated Payout: ₹${payout}\n\nGoogle Maps Directions:\n${mapsUrl}\n\nOpen your Partner App to review and accept:\n${portalUrl}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #0f172a; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
            <div style="background: #059669; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DispatchGrid Partner Fleet</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">New Live Work Order Dispatched to You</p>
            </div>
            
            <div style="padding: 28px 24px;">
              <div style="display: inline-block; background: #1e1b4b; border: 1px solid #4f46e5; color: #a5b4fc; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                Instant Offer • 1-Min Window
              </div>
              <h2 style="margin: 0 0 10px 0; color: #180018; font-size: 20px; font-weight: 800;">New Job in ${customerAddress}!</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Hello <strong>Captain ${techName}</strong>, you have been selected for this urgent job because you are the <strong>closest qualified technician</strong> to the worksite.
              </p>

              <!-- Distance & Payout Highlight -->
              <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">GPS Distance</div>
                  <div style="font-size: 22px; font-weight: 900; color: #522959; margin-top: 4px;">${distanceKm.toFixed(1)} km</div>
                </div>
                <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Estimated Payout</div>
                  <div style="font-size: 22px; font-weight: 900; color: #34d399; margin-top: 4px;">₹${payout}</div>
                </div>
              </div>

              <!-- Worksite Details Card -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
                <div style="font-size: 12px; font-weight: 700; color: #522959; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
                  Worksite & Order Information
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 140px;">Task / Service:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #ffffff;">${jobTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Customer Name:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Worksite Address:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #facc15;">${customerAddress}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Expected Arrival:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #6ee7b7;">By ${scheduledArrival}</td>
                  </tr>
                </table>
              </div>

              <!-- Google Maps CTA -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${mapsUrl}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                  Open Google Maps Live Turn-by-Turn Route
                </a>
              </div>

              <div style="text-align: center;">
                <a href="${portalUrl}" target="_blank" style="color: #522959; font-size: 12px; text-decoration: underline;">
                  Open Partner Operations Console
                </a>
              </div>
            </div>
            
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 11px;">
                (c) 2026 DispatchGrid On-Demand Fleet Logistics • Automated Job Dispatch Alert
              </p>
            </div>
          </div>
        `,
      };

      if (gmailUser && to.toLowerCase() !== gmailUser.toLowerCase()) {
        mailOptions.bcc = gmailUser;
      }

      await transporter.sendMail(mailOptions);
      recordSentEmail({
        id: `tech-${Date.now()}`,
        type: 'TECH_JOB_OFFER',
        to,
        subject: mailOptions.subject,
        preview: `New job offer for Captain ${techName} in ${serviceZone}. Distance: ${distanceKm.toFixed(1)} km. Arrival: by ${scheduledArrival}.`,
        sentAt: new Date().toISOString(),
        techName,
        customerName,
        address: customerAddress,
        scheduledArrival,
        distanceKm,
      });
      console.log(`\n======================================================`);
      console.log(`[TECHNICIAN JOB OFFER EMAIL DELIVERED TO GMAIL]`);
      console.log(`   To: ${to}`);
      console.log(`   Captain: ${techName}`);
      console.log(`   Worksite: ${customerAddress}`);
      console.log(`   Distance: ${distanceKm.toFixed(1)} km`);
      console.log(`   Subject: ${mailOptions.subject}`);
      console.log(`   Dispatched via: ${gmailUser}`);
      console.log(`======================================================\n`);
      return { delivered: true };
    } catch (err: any) {
      console.error(`[SMTP ERROR]: Failed to send job alert email to technician ${to}:`, err.message);
      return { delivered: false, error: err.message };
    }
  }

  // Fallback console log
  console.log(`\n======================================================`);
  console.log(`[TECHNICIAN JOB OFFER DISPATCHED TO: ${to}]`);
  console.log(`   Captain: ${techName}`);
  console.log(`   Worksite: ${customerAddress}`);
  console.log(`   Distance: ${distanceKm.toFixed(1)} km`);
  console.log(`   Arrival: ${scheduledArrival}`);
  console.log(`======================================================\n`);

  return { delivered: false, error: 'NO_SMTP_CREDENTIALS_IN_ENV' };
}


export interface SendNearbyJobOpeningOptions {
  to: string;
  techName: string;
  jobTitle: string;
  customerAddress: string;
  serviceZone: string;
  distanceKm: number;
  payout?: number;
  jobId: string;
  portalUrl?: string;
}

export async function sendNearbyJobOpeningAlertEmail({
  to,
  techName,
  jobTitle,
  customerAddress,
  serviceZone,
  distanceKm,
  payout = 1050,
  jobId,
  portalUrl = 'http://172.16.25.82:5173/technician',
}: SendNearbyJobOpeningOptions): Promise<{ delivered: boolean; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  const mapsUrl = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(customerAddress + ", Bengaluru");

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''),
        },
      });

      const mailOptions: any = {
        from: '"DispatchGrid Operations" <' + gmailUser + '>',
        to,
        subject: "[DispatchGrid Nearby Opportunity] ⚡ New Service Opening in " + serviceZone + " (" + distanceKm.toFixed(1) + " km away)",
        text: "Hello Captain " + techName + ",\n\nA new service job just opened near your location!\n\nService: " + jobTitle + "\nWorksite: " + customerAddress + " (" + serviceZone + ")\nDistance from you: " + distanceKm.toFixed(1) + " km\nEstimated Payout: ₹" + payout + "\n\nDirections:\n" + mapsUrl + "\n\nOpen Partner Terminal to accept or view details:\n" + portalUrl,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #0f172a; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
            <div style="background: #522959; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DispatchGrid Fleet Radar</h1>
              <p style="margin: 4px 0 0 0; color: #fae5d8; font-size: 13px;">New Service Job Available Near Your Location</p>
            </div>
            
            <div style="padding: 28px 24px; background: #ffffff;">
              <div style="display: inline-block; background: #faf5ff; border: 1px solid #c084fc; color: #6b21a8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                ⚡ Proximity Alert • ${distanceKm.toFixed(1)} km away
              </div>
              <h2 style="margin: 0 0 10px 0; color: #180018; font-size: 20px; font-weight: 800;">New Opening: ${jobTitle}!</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Hello <strong>Captain ${techName}</strong>, a new service request was just booked near your active duty zone. You are receiving this notification because you are stationed within proximity of the worksite.
              </p>

              <!-- Distance & Payout Highlight -->
              <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <div style="flex: 1; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 12px; padding: 14px; text-align: center;">
                  <div style="font-size: 10px; color: #1e40af; text-transform: uppercase; font-weight: 700;">Distance From You</div>
                  <div style="font-size: 22px; font-weight: 900; color: #2563eb; margin-top: 4px;">${distanceKm.toFixed(1)} km</div>
                </div>
                <div style="flex: 1; background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 14px; text-align: center;">
                  <div style="font-size: 10px; color: #166534; text-transform: uppercase; font-weight: 700;">Est. Potential Earnings</div>
                  <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 4px;">₹${payout}</div>
                </div>
              </div>

              <!-- Worksite Details Card -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
                <div style="font-size: 12px; font-weight: 700; color: #522959; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                  Job Opening Details
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 140px;">Task / Service:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #180018;">${jobTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Worksite Location:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #b45309;">${customerAddress}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Service Zone:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #522959;">${serviceZone}</td>
                  </tr>
                </table>
              </div>

              <!-- Solid Action Buttons (No Gradient) -->
              <div style="text-align: center; margin-bottom: 16px;">
                <a href="${portalUrl}" target="_blank" style="display: inline-block; background: #522959; color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(82, 41, 89, 0.25);">
                  Open Partner Terminal & Review Job
                </a>
              </div>

              <div style="text-align: center;">
                <a href="${mapsUrl}" target="_blank" style="color: #2563eb; font-size: 12px; text-decoration: underline;">
                  View Live Route on Google Maps
                </a>
              </div>
            </div>
            
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                (c) 2026 DispatchGrid On-Demand Fleet Logistics • Automated Proximity Alert
              </p>
            </div>
          </div>
        `,
      };

      if (gmailUser && to.toLowerCase() !== gmailUser.toLowerCase()) {
        mailOptions.bcc = gmailUser;
      }

      await transporter.sendMail(mailOptions);
      recordSentEmail({
        id: "nearby-" + Date.now(),
        type: 'TECH_JOB_OFFER',
        to,
        subject: mailOptions.subject,
        preview: "Nearby job opportunity for Captain " + techName + ": " + jobTitle + " (" + distanceKm.toFixed(1) + " km away).",
        sentAt: new Date().toISOString(),
        techName,
        address: customerAddress,
        distanceKm,
      });
      console.log("\n======================================================");
      console.log("[NEARBY JOB OPENING ALERT DELIVERED TO GMAIL]");
      console.log("   To: " + to);
      console.log("   Captain: " + techName);
      console.log("   Distance: " + distanceKm.toFixed(1) + " km");
      console.log("   Dispatched via: " + gmailUser);
      console.log("======================================================\n");
      return { delivered: true };
    } catch (err) {
      console.error("[SMTP ERROR]: Failed to send nearby job alert to " + to + ":", err.message);
      return { delivered: false, error: err.message };
    }
  }

  // Fallback console log
  console.log("\n======================================================");
  console.log("[NEARBY JOB OPENING DISPATCHED TO: " + to + "]");
  console.log("   Captain: " + techName);
  console.log("   Distance: " + distanceKm.toFixed(1) + " km");
  console.log("   Service: " + jobTitle);
  console.log("======================================================\n");

  return { delivered: false, error: 'NO_SMTP_CREDENTIALS_IN_ENV' };
}
