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
const EMAIL_EVENT_TYPES = Object.freeze({
  OS_CREATED: 'os_created',
  STATUS_UPDATED: 'status_updated',
  DESCRIPTION_UPDATED: 'description_updated'
});

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

function buildCreatedEmailText({
  clientName,
  osId,
  status,
  equipment,
  publicUrl,
  hasQrCode
}) {
  const safeClientName = clientName || 'Cliente';
  const safeStatus = status || 'Aberto';
  const safeEquipment = equipment || 'seu equipamento';
  const safePublicUrl = publicUrl || null;

  return [
    `Ola, ${safeClientName}!`,
    '',
    `Sua ordem de servico #${osId} foi aberta com sucesso.`,
    `Equipamento: ${safeEquipment}`,
    `Status inicial: ${safeStatus}`,
    '',
    safePublicUrl
      ? `Acompanhe o andamento da sua ordem de servico pelo link publico: ${safePublicUrl}`
      : 'Acompanhe o andamento da sua ordem de servico pelo nosso canal de atendimento.',
    hasQrCode
      ? 'QR Code: escaneie a imagem deste e-mail para abrir a pagina publica mais rapidamente.'
      : null,
    '',
    'Se tiver qualquer duvida, basta responder este e-mail.'
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

function buildCreatedEmailHtml({
  clientName,
  osId,
  status,
  equipment,
  publicUrl,
  qrCodeCid
}) {
  const safeClientName = escapeHtml(clientName || 'Cliente');
  const safeStatus = escapeHtml(status || 'Aberto');
  const safeEquipment = escapeHtml(equipment || 'seu equipamento');
  const parsedOsId = Number(osId);
  const safeOsId = Number.isInteger(parsedOsId) && parsedOsId > 0 ? String(parsedOsId) : 'N/A';
  const safePublicUrl = String(publicUrl || '').trim();
  const escapedPublicUrl = safePublicUrl ? escapeHtml(safePublicUrl) : '';
  const hasPublicUrl = Boolean(safePublicUrl);
  const hasQrCode = Boolean(qrCodeCid);
  const escapedQrCodeCid = hasQrCode ? escapeHtml(qrCodeCid) : '';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <p>Ola, <strong>${safeClientName}</strong>!</p>
      <p>Sua ordem de servico <strong>#${safeOsId}</strong> foi aberta com sucesso.</p>
      <p><strong>Equipamento:</strong> ${safeEquipment}</p>
      <p><strong>Status inicial:</strong> ${safeStatus}</p>
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
          Acompanhar ordem de servico
        </a>
      </p>
      <p style="font-size:12px;color:#666;word-break:break-all;">${escapedPublicUrl}</p>
      `
          : ''
      }
      ${
        hasQrCode
          ? `
      <p><strong>Escaneie o QR Code para abrir a pagina publica:</strong></p>
      <p>
        <img
          src="cid:${escapedQrCodeCid}"
          alt="QR Code da pagina publica da ordem de servico"
          width="180"
          height="180"
          style="display:block;border:1px solid #e1e1e1;border-radius:10px;padding:8px;background:#fff;"
        />
      </p>
      `
          : ''
      }
      <p>Se tiver qualquer duvida, basta responder este e-mail.</p>
    </div>
  `;
}

function buildDescriptionUpdatedEmailText({
  clientName,
  osId,
  status,
  equipment,
  description,
  publicUrl,
  hasQrCode
}) {
  const safeClientName = clientName || 'Cliente';
  const safeStatus = status || 'Atualizado';
  const safeEquipment = equipment || 'seu equipamento';
  const safeDescription = String(description || '').trim() || 'Nao informado';
  const safePublicUrl = publicUrl || null;

  return [
    `Ola, ${safeClientName}!`,
    '',
    `A descricao do problema da sua ordem de servico #${osId} foi atualizada.`,
    `Equipamento: ${safeEquipment}`,
    `Status atual: ${safeStatus}`,
    `Descricao atual: ${safeDescription}`,
    '',
    safePublicUrl
      ? `Acompanhe sua ordem de servico pelo link publico: ${safePublicUrl}`
      : 'Acompanhe sua ordem de servico pelo nosso canal de atendimento.',
    hasQrCode
      ? 'QR Code: escaneie a imagem deste e-mail para abrir a pagina publica mais rapidamente.'
      : null,
    '',
    'Se tiver qualquer duvida, basta responder este e-mail.'
  ]
    .filter(Boolean)
    .join('\n');
}

function buildDescriptionUpdatedEmailHtml({
  clientName,
  osId,
  status,
  equipment,
  description,
  publicUrl,
  qrCodeCid
}) {
  const safeClientName = escapeHtml(clientName || 'Cliente');
  const safeStatus = escapeHtml(status || 'Atualizado');
  const safeEquipment = escapeHtml(equipment || 'seu equipamento');
  const safeDescription = escapeHtml(String(description || '').trim() || 'Nao informado');
  const parsedOsId = Number(osId);
  const safeOsId = Number.isInteger(parsedOsId) && parsedOsId > 0 ? String(parsedOsId) : 'N/A';
  const safePublicUrl = String(publicUrl || '').trim();
  const escapedPublicUrl = safePublicUrl ? escapeHtml(safePublicUrl) : '';
  const hasPublicUrl = Boolean(safePublicUrl);
  const hasQrCode = Boolean(qrCodeCid);
  const escapedQrCodeCid = hasQrCode ? escapeHtml(qrCodeCid) : '';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <p>Ola, <strong>${safeClientName}</strong>!</p>
      <p>A descricao do problema da sua ordem de servico <strong>#${safeOsId}</strong> foi atualizada.</p>
      <p><strong>Equipamento:</strong> ${safeEquipment}</p>
      <p><strong>Status atual:</strong> ${safeStatus}</p>
      <p><strong>Descricao atual:</strong> ${safeDescription}</p>
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
          Acompanhar ordem de servico
        </a>
      </p>
      <p style="font-size:12px;color:#666;word-break:break-all;">${escapedPublicUrl}</p>
      `
          : ''
      }
      ${
        hasQrCode
          ? `
      <p><strong>Escaneie o QR Code para abrir a pagina publica:</strong></p>
      <p>
        <img
          src="cid:${escapedQrCodeCid}"
          alt="QR Code da pagina publica da ordem de servico"
          width="180"
          height="180"
          style="display:block;border:1px solid #e1e1e1;border-radius:10px;padding:8px;background:#fff;"
        />
      </p>
      `
          : ''
      }
      <p>Se tiver qualquer duvida, basta responder este e-mail.</p>
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
  publicUrl,
  description,
  eventType = EMAIL_EVENT_TYPES.STATUS_UPDATED
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

    let finalSubject = subject;
    let finalText = text;
    let finalHtml = html;

    const normalizedEventType = String(eventType || '').trim().toLowerCase();
    const isCreationEvent = normalizedEventType === EMAIL_EVENT_TYPES.OS_CREATED;
    const isDescriptionUpdateEvent =
      normalizedEventType === EMAIL_EVENT_TYPES.DESCRIPTION_UPDATED;

    if (isCreationEvent) {
      finalSubject = 'Sua ordem de servico foi aberta';
      finalText = buildCreatedEmailText({
        clientName,
        osId,
        status,
        equipment,
        publicUrl,
        hasQrCode: Boolean(qrCodePayload)
      });
      finalHtml = buildCreatedEmailHtml({
        clientName,
        osId,
        status,
        equipment,
        publicUrl,
        qrCodeCid: qrCodePayload?.cid || null
      });
    } else if (isDescriptionUpdateEvent) {
      finalSubject = 'Descricao do problema da OS foi atualizada';
      finalText = buildDescriptionUpdatedEmailText({
        clientName,
        osId,
        status,
        equipment,
        description,
        publicUrl,
        hasQrCode: Boolean(qrCodePayload)
      });
      finalHtml = buildDescriptionUpdatedEmailHtml({
        clientName,
        osId,
        status,
        equipment,
        description,
        publicUrl,
        qrCodeCid: qrCodePayload?.cid || null
      });
    }

    const mailOptions = {
      from: EMAIL_FROM,
      to: normalizedEmail,
      subject: finalSubject,
      text: finalText,
      html: finalHtml
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
