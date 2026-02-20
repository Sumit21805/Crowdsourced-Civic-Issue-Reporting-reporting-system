import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }
  // No SMTP configured: log to console (dev)
  return null;
}

export async function sendReportToDepartment(options: {
  to: string;
  reportId: number;
  title: string;
  description: string;
  pin: string;
  userName: string;
}) {
  const transporter = getTransporter();
  const html = `
    <h2>New report #${options.reportId}</h2>
    <p><strong>From:</strong> ${options.userName}</p>
    <p><strong>Title:</strong> ${options.title}</p>
    <p><strong>Description:</strong></p>
    <p>${options.description}</p>
    <p><strong>PIN (for verification):</strong> ${options.pin}</p>
    <p>Status: Open. Please log in to the dashboard to update the status.</p>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@report-dashboard.local',
      to: options.to,
      subject: `[Report #${options.reportId}] ${options.title}`,
      html,
    });
  } else {
    console.log('[Email not configured] Report to department:', { to: options.to, reportId: options.reportId, title: options.title, pin: options.pin });
  }
}