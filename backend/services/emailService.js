const nodemailer = require('nodemailer');

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const EMAIL_GMAIL_USER = process.env.EMAIL_GMAIL_USER || null;
const EMAIL_GMAIL_APP_PASSWORD = process.env.EMAIL_GMAIL_APP_PASSWORD || null;
const EMAIL_FROM = process.env.EMAIL_FROM || (
  EMAIL_GMAIL_USER
    ? `Assistencia Tecnica <${EMAIL_GMAIL_USER}>`
    : 'Assistencia Tecnica <no-reply@assistencia.local>'
);

let transporterPromise = null;

function normalizeEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  if (!normalized) return null;

  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(normalized)) return null;

  return normalized;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildStatusEmailText({
  clientName,
  osId,
  status,
  equipment
}) {
  const safeClientName = clientName || 'Cliente';
  const safeStatus = status || 'atualizado';
  const safeEquipment = equipment || 'seu equipamento';

  return [
    `Ola, ${safeClientName}.`,
    '',
    `A OS #${osId} (${safeEquipment}) foi atualizada para: ${safeStatus}.`,
    '',
    'Em caso de duvidas, entre em contato com a assistencia.'
  ].join('\n');
}

function buildStatusEmailHtml({
  clientName,
  osId,
  status,
  equipment
}) {
  const safeClientName = escapeHtml(clientName || 'Cliente');
  const safeStatus = escapeHtml(status || 'atualizado');
  const safeEquipment = escapeHtml(equipment || 'seu equipamento');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <p>Ola, <strong>${safeClientName}</strong>.</p>
      <p>
        A OS <strong>#${osId}</strong> (${safeEquipment}) foi atualizada para:
        <strong>${safeStatus}</strong>.
      </p>
      <p>Em caso de duvidas, entre em contato com a assistencia.</p>
    </div>
  `;
}

async function createTransporter() {
  if (!EMAIL_GMAIL_USER || !EMAIL_GMAIL_APP_PASSWORD) {
    const error = new Error('Gmail SMTP nao configurado');
    error.code = 'GMAIL_NOT_CONFIGURED';
    throw error;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_GMAIL_USER,
      pass: EMAIL_GMAIL_APP_PASSWORD
    }
  });
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }
  return transporterPromise;
}

async function sendStatusEmailNotification({
  email,
  clientName,
  osId,
  status,
  equipment
}) {
  if (!EMAIL_ENABLED) {
    return {
      sent: false,
      status: 'disabled',
      details: 'Email notifications disabled'
    };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return {
      sent: false,
      status: 'invalid_email',
      details: 'Email do cliente invalido ou ausente'
    };
  }

  try {
    const transporter = await getTransporter();
    const subject = `Atualizacao da OS #${osId}`;
    const text = buildStatusEmailText({ clientName, osId, status, equipment });
    const html = buildStatusEmailHtml({ clientName, osId, status, equipment });

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: normalizedEmail,
      subject,
      text,
      html
    });

    return {
      sent: true,
      status: 'sent',
      details: info.messageId || null
    };
  } catch (error) {
    if (error.code === 'GMAIL_NOT_CONFIGURED') {
      return {
        sent: false,
        status: 'not_configured',
        details: 'Defina EMAIL_GMAIL_USER e EMAIL_GMAIL_APP_PASSWORD no .env'
      };
    }

    return {
      sent: false,
      status: 'provider_error',
      details: error.message
    };
  }
}

module.exports = {
  sendStatusEmailNotification
};
