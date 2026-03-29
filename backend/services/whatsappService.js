const axios = require('axios');

const WHATSAPP_API_BASE_URL = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v22.0';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === 'true';
const WHATSAPP_SIMULATION_MODE = process.env.WHATSAPP_SIMULATION_MODE === 'true';
const WHATSAPP_DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '55';

function isConfigured() {
  return Boolean(WHATSAPP_ENABLED && WHATSAPP_API_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}

function normalizePhone(rawPhone) {
  if (!rawPhone) return null;

  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length < 10) {
    return null;
  }

  if (!digits.startsWith(WHATSAPP_DEFAULT_COUNTRY_CODE)) {
    digits = `${WHATSAPP_DEFAULT_COUNTRY_CODE}${digits}`;
  }

  return digits;
}

function buildStatusMessage({
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
    `A OS #${osId} (${safeEquipment}) foi atualizada para: ${safeStatus}.`,
    'Em caso de duvidas, entre em contato com a assistencia.'
  ].join('\n');
}

async function sendStatusNotification({
  phone,
  clientName,
  osId,
  status,
  equipment
}) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return {
      sent: false,
      status: 'invalid_phone',
      details: 'Telefone do cliente invalido ou ausente'
    };
  }

  if (WHATSAPP_SIMULATION_MODE) {
    const simulatedMessage = buildStatusMessage({ clientName, osId, status, equipment });
    const simulatedMessageId = `simulated_${Date.now()}`;

    console.log('simulação whatsapp', {
      to: normalizedPhone,
      osId,
      status,
      simulatedMessageId,
      simulatedMessage
    });

    return {
      sent: true,
      status: 'simulated',
      details: simulatedMessageId
    };
  }

  if (!isConfigured()) {
    return {
      sent: false,
      status: 'not_configured',
      details: 'WhatsApp API nao configurada'
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: buildStatusMessage({ clientName, osId, status, equipment })
    }
  };

  const url = `${WHATSAPP_API_BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    const providerMessageId = response.data?.messages?.[0]?.id || null;

    return {
      sent: true,
      status: 'sent',
      details: providerMessageId
    };
  } catch (error) {
    const providerStatusCode = error.response?.status || null;
    const providerMessage = error.response?.data?.error?.message || error.message;

    return {
      sent: false,
      status: providerStatusCode ? `provider_${providerStatusCode}` : 'provider_error',
      details: providerMessage
    };
  }
}

module.exports = {
  sendStatusNotification
};
