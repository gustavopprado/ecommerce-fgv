// backend/src/utils/email.js
const nodemailer = require('nodemailer');

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('[EMAIL] Variáveis SMTP não configuradas corretamente.');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false, // 587 = TLS STARTTLS (não é secure direto)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

async function sendMail({ to, subject, html, attachments }) {
  const from = process.env.REPORT_FROM || process.env.SMTP_USER;

  const transporter = createTransporter();

  // opcional: debug de conexão
  // await transporter.verify();

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments,
  });
}

module.exports = { sendMail };
