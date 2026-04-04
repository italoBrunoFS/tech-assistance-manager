const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const EMAIL_GMAIL_USER = process.env.EMAIL_GMAIL_USER || null;
const EMAIL_GMAIL_APP_PASSWORD = process.env.EMAIL_GMAIL_APP_PASSWORD || null;
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  (EMAIL_GMAIL_USER
    ? `Assistência Técnica <${EMAIL_GMAIL_USER}>`
    : 'Assistência Técnica <no-reply@assistencia.local>');

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
  status,
  equipment,
  publicUrl,
  hasQrCode
}) {
  const safeClientName = clientName || 'Cliente';
  const safeStatus = status || 'Atualizado';
  const safeEquipment = equipment || 'seu equipamento';
  const safePublicUrl = publicUrl || null;

  return [
    `Olá, ${safeClientName}!`,
    '',
    'Houve uma atualização da sua ordem de serviço.',
    `Equipamento: ${safeEquipment}`,
    `Novo status: ${safeStatus}`,
    '',
    safePublicUrl
      ? `Acompanhe o andamento da sua ordem de serviço pelo link público: ${safePublicUrl}`
      : 'Acompanhe o andamento da sua ordem de serviço pelo nosso canal de atendimento.',
    hasQrCode
      ? 'QR Code: escaneie a imagem deste e-mail para abrir a página pública mais rapidamente.'
      : null,
    '',
    'Se tiver qualquer dúvida, basta responder este e-mail.'
  ]
    .filter(Boolean)
    .join('\n');
}

function buildStatusEmailHtml({
  clientName,
  status,
  equipment,
  publicUrl,
  qrCodeCid
}) {
  const safeClientName = escapeHtml(clientName || 'Cliente');
  const safeStatus = escapeHtml(status || 'Atualizado');
  const safeEquipment = escapeHtml(equipment || 'seu equipamento');
  const safePublicUrl = String(publicUrl || '').trim();
  const escapedPublicUrl = safePublicUrl ? escapeHtml(safePublicUrl) : '';
  const hasPublicUrl = Boolean(safePublicUrl);
  const hasQrCode = Boolean(qrCodeCid);
  const escapedQrCodeCid = hasQrCode ? escapeHtml(qrCodeCid) : '';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <p>Olá, <strong>${safeClientName}</strong>!</p>
      <p>Houve uma atualização da sua ordem de serviço.</p>
      <p><strong>Equipamento:</strong> ${safeEquipment}</p>
      <p><strong>Novo status:</strong> ${safeStatus}</p>
      ${
        hasPublicUrl
          ? `
      <p>
        <a
          href="${escapedPublicUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="display:inline-block;padding:10px 16px;background:#1f7a5a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;"
        >
          Ver andamento da ordem de serviço
        </a>
      </p>
      <p style="font-size:12px;color:#666;word-break:break-all;">${escapedPublicUrl}</p>
      `
          : ''
      }
      ${
        hasQrCode
          ? `
      <p><strong>Escaneie o QR Code para abrir a página pública:</strong></p>
      <p>
        <img
          src="cid:${escapedQrCodeCid}"
          alt="QR Code da página pública da ordem de serviço"
          width="180"
          height="180"
          style="display:block;border:1px solid #e1e1e1;border-radius:10px;padding:8px;background:#fff;"
        />
      </p>
      `
          : ''
      }
      <p>Se tiver qualquer dúvida, basta responder este e-mail.</p>
    </div>
  `;
}

async function buildPublicStatusQrAttachment({ publicUrl, osId }) {
  const safePublicUrl = String(publicUrl || '').trim();
  if (!safePublicUrl) return null;

  try {
    const qrCodeBuffer = await QRCode.toBuffer(safePublicUrl, {
      type: 'png',
      width: 220,
      margin: 1,
      color: {
        dark: '#1f7a5a',
        light: '#ffffff'
      }
    });

    const numericOsId = Number(osId);
    const safeOsId = Number.isInteger(numericOsId) && numericOsId > 0 ? numericOsId : 'status';
    const cid = `public-os-${safeOsId}@assistencia.local`;

    return {
      cid,
      attachment: {
        filename: 'qrcode-ordem-servico.png',
        content: qrCodeBuffer,
        contentType: 'image/png',
        cid
      }
    };
  } catch (error) {
    console.error('Falha ao gerar QR code da OS para email:', error.message);
    return null;
  }
}

async function createTransporter() {
  if (!EMAIL_GMAIL_USER || !EMAIL_GMAIL_APP_PASSWORD) {
    const error = new Error('Gmail SMTP não configurado');
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
  equipment,
  publicUrl
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
      details: 'E-mail do cliente inválido ou ausente'
    };
  }

  try {
    const transporter = await getTransporter();
    const qrCodePayload = await buildPublicStatusQrAttachment({ publicUrl, osId });
    const subject = 'Houve uma atualização da sua ordem de serviço';
    const text = buildStatusEmailText({
      clientName,
      status,
      equipment,
      publicUrl,
      hasQrCode: Boolean(qrCodePayload)
    });
    const html = buildStatusEmailHtml({
      clientName,
      status,
      equipment,
      publicUrl,
      qrCodeCid: qrCodePayload?.cid || null
    });

    const mailOptions = {
      from: EMAIL_FROM,
      to: normalizedEmail,
      subject,
      text,
      html
    };

    if (qrCodePayload) {
      mailOptions.attachments = [qrCodePayload.attachment];
    }

    const info = await transporter.sendMail(mailOptions);

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
