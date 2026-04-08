const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const model = require('../models/osModel');
const notificationModel = require('../models/notificationModel');
const photoModel = require('../models/photoModel');
const { sendStatusNotification } = require('../services/whatsappService');
const { sendStatusEmailNotification } = require('../services/emailService');

const ALLOWED_STATUS = new Set([
  'Aberto',
  'Em Analise',
  'Aguardando Peca',
  'Concluido'
]);
const LEGACY_STATUS_ALIASES = new Map([
  ['em analise tecnica', 'Em Analise'],
  ['em conserto', 'Aguardando Peca'],
  ['concluida', 'Concluido']
]);
const DEFAULT_PUBLIC_OS_PAGE_BASE_URL = 'http://localhost:5173';
const STATUS_AUDIT_CHANNEL = 'AUDITORIA_STATUS';
const STATUS_AUDIT_PREFIX = 'STATUS|';
const DESCRIPTION_AUDIT_CHANNEL = 'AUDITORIA_OS';
const DESCRIPTION_AUDIT_PREFIX = 'DESCRICAO|';

function getPublicAccessSecret() {
  return String(
    process.env.PUBLIC_OS_ACCESS_SECRET ||
      process.env.AUTH_TOKEN_SECRET ||
      'public-os-dev-secret'
  );
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildPublicAccessToken(idOs) {
  const content = `os:${idOs}`;
  const signature = crypto
    .createHmac('sha256', getPublicAccessSecret())
    .update(content)
    .digest();

  return toBase64Url(signature);
}

function isValidPublicAccessToken(idOs, providedToken) {
  const received = String(providedToken || '').trim();
  if (!received) {
    return false;
  }

  const expected = buildPublicAccessToken(idOs);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function requirePublicAccessToken(req, res, idOs) {
  const providedToken = req.query?.access_token;

  if (!isValidPublicAccessToken(idOs, providedToken)) {
    res.status(403).json({ message: 'Acesso publico invalido para esta OS' });
    return false;
  }

  return true;
}

function attachPublicStatusUrl(req, order) {
  if (!order || !order.id_os) {
    return order;
  }

  return {
    ...order,
    public_status_url: buildPublicStatusPageUrl(req, order.id_os)
  };
}

const getAllOS = async (req, res) => {
  try {
    const orders = await model.getAllOS();
    res.status(200).json(orders.map((order) => attachPublicStatusUrl(req, order)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOSByFilters = async (req, res) => {
  try {
    const idOs = Number(req.query?.id_os);
    const idEquipamento = Number(req.query?.id_equipamento);
    const idFuncionario = Number(req.query?.id_funcionario);
    const requestedStatus = String(req.query?.status_os || '').trim();
    const hasDataFrom = Boolean(req.query?.data_from);
    const hasDataTo = Boolean(req.query?.data_to);
    const dataFrom = hasDataFrom ? new Date(req.query.data_from) : null;
    const dataTo = hasDataTo ? new Date(req.query.data_to) : null;

    if (req.query?.id_os && (!Number.isInteger(idOs) || idOs <= 0)) {
      return res.status(400).json({ message: 'id_os invalido' });
    }

    if (req.query?.id_equipamento && (!Number.isInteger(idEquipamento) || idEquipamento <= 0)) {
      return res.status(400).json({ message: 'id_equipamento invalido' });
    }

    if (req.query?.id_funcionario && (!Number.isInteger(idFuncionario) || idFuncionario <= 0)) {
      return res.status(400).json({ message: 'id_funcionario invalido' });
    }

    if (hasDataFrom && Number.isNaN(dataFrom?.getTime())) {
      return res.status(400).json({ message: 'data_from invalida' });
    }

    if (hasDataTo && Number.isNaN(dataTo?.getTime())) {
      return res.status(400).json({ message: 'data_to invalida' });
    }

    let statusOs = null;
    if (requestedStatus) {
      statusOs = resolveCanonicalStatus(requestedStatus);
      if (!statusOs) {
        return res.status(400).json({ message: 'status_os invalido' });
      }
    }

    const orders = await model.getOSByFilters({
      id_os: Number.isInteger(idOs) && idOs > 0 ? idOs : null,
      status_os: statusOs,
      id_equipamento: Number.isInteger(idEquipamento) && idEquipamento > 0 ? idEquipamento : null,
      id_funcionario: Number.isInteger(idFuncionario) && idFuncionario > 0 ? idFuncionario : null,
      data_from: dataFrom,
      data_to: dataTo,
      descricao_problema: String(req.query?.descricao_problema || '').trim() || null,
      serial: String(req.query?.serial || '').trim() || null,
      cliente_nome: String(req.query?.cliente_nome || '').trim() || null
    });

    return res.status(200).json(orders.map((order) => attachPublicStatusUrl(req, order)));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getOSById = async (req, res) => {
  try {
    const order = await model.getOSById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    res.status(200).json(attachPublicStatusUrl(req, order));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createOS = async (req, res) => {
  try {
    const requestedStatus = String(req.body?.status_os || 'Aberto').trim() || 'Aberto';
    const status = resolveCanonicalStatus(requestedStatus);

    if (!status) {
      return res.status(400).json({ message: 'status_os invalido' });
    }

    const completionDate = status === 'Concluido' ? new Date() : null;

    const order = await model.createOS({
      ...req.body,
      status_os: status,
      data_conclusao: completionDate
    });

    await registerStatusHistoryLog({
      idOs: order.id_os,
      previousStatus: null,
      newStatus: order.status_os,
      actorId: req.auth?.sub || order.id_funcionario || null,
      origin: 'abertura'
    });

    const context = await model.getStatusNotificationContext(order.id_os);
    const equipmentName = context
      ? `${context.tipo} ${context.marca} ${context.modelo}`.trim()
      : null;
    const publicStatusUrl = buildPublicStatusPageUrl(req, order.id_os);

    const emailResult = await sendStatusEmailNotification({
      email: context?.email,
      clientName: context?.nome_cliente,
      osId: order.id_os,
      status: order.status_os,
      equipment: equipmentName,
      publicUrl: publicStatusUrl,
      eventType: 'os_created'
    });

    await registerNotificationLog({
      idOs: order.id_os,
      statusOs: order.status_os,
      sent: emailResult.sent,
      channel: 'Email'
    });

    res.status(201).json({
      ...order,
      public_status_url: publicStatusUrl,
      email_notification: {
        channel: 'Email',
        sent: emailResult.sent,
        status: emailResult.status,
        public_url: publicStatusUrl
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function registerNotificationLog({
  idOs,
  statusOs,
  sent,
  channel,
  tipo
}) {
  try {
    await notificationModel.createNotification({
      id_os: idOs,
      tipo: tipo || `Mudança de status para ${statusOs}`,
      data_envio: new Date(),
      status_envio: sent ? 'Enviado' : 'Falha',
      canal: channel
    });
  } catch (notificationLogError) {
    console.error(
      `Falha ao registrar notificação ${channel} no banco:`,
      notificationLogError.message
    );
  }
}

function encodeAuditValue(value) {
  return String(value || '').replace(/\|/g, '/');
}

function decodeAuditValue(value) {
  const rawValue = String(value || '').trim();
  return rawValue === 'NULL' ? null : rawValue;
}

function buildStatusAuditType({
  previousStatus,
  newStatus,
  actorId,
  origin
}) {
  const previous = previousStatus ? encodeAuditValue(previousStatus) : 'NULL';
  const next = newStatus ? encodeAuditValue(newStatus) : 'NULL';
  const actor = actorId ? String(actorId) : 'NULL';
  const source = origin ? encodeAuditValue(origin) : 'sistema';

  return `${STATUS_AUDIT_PREFIX}${previous}|${next}|${actor}|${source}`;
}

function parseStatusAuditType(tipo) {
  const rawType = String(tipo || '');

  if (!rawType.startsWith(STATUS_AUDIT_PREFIX)) {
    return null;
  }

  const payload = rawType.slice(STATUS_AUDIT_PREFIX.length).split('|');

  if (payload.length < 4) {
    return null;
  }

  const [previousStatusRaw, newStatusRaw, actorIdRaw, originRaw] = payload;
  const parsedActorId = decodeAuditValue(actorIdRaw);
  const actorId = parsedActorId ? Number(parsedActorId) : null;

  return {
    status_anterior: decodeAuditValue(previousStatusRaw),
    status_novo: decodeAuditValue(newStatusRaw),
    id_funcionario: Number.isInteger(actorId) && actorId > 0 ? actorId : null,
    origem: decodeAuditValue(originRaw) || 'sistema'
  };
}

function buildDescriptionAuditType({
  actorId,
  origin
}) {
  const actor = actorId ? String(actorId) : 'NULL';
  const source = origin ? encodeAuditValue(origin) : 'manual';

  return `${DESCRIPTION_AUDIT_PREFIX}${actor}|${source}`;
}

function parseDescriptionAuditType(tipo) {
  const rawType = String(tipo || '');

  if (!rawType.startsWith(DESCRIPTION_AUDIT_PREFIX)) {
    return null;
  }

  const payload = rawType.slice(DESCRIPTION_AUDIT_PREFIX.length).split('|');

  if (payload.length < 2) {
    return null;
  }

  const [actorIdRaw, originRaw] = payload;
  const parsedActorId = decodeAuditValue(actorIdRaw);
  const actorId = parsedActorId ? Number(parsedActorId) : null;

  return {
    id_funcionario: Number.isInteger(actorId) && actorId > 0 ? actorId : null,
    origem: decodeAuditValue(originRaw) || 'manual'
  };
}

function mapStatusHistoryRows(notificationRows) {
  return notificationRows
    .filter((row) => row.canal === STATUS_AUDIT_CHANNEL)
    .map((row) => {
      const parsed = parseStatusAuditType(row.tipo);

      if (!parsed || !parsed.status_novo) {
        return null;
      }

      return {
        id_historico: row.id_notificacao,
        id_os: row.id_os,
        status_anterior: parsed.status_anterior,
        status_novo: parsed.status_novo,
        id_funcionario: parsed.id_funcionario,
        origem: parsed.origem,
        data_alteracao: row.data_envio
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftDate = new Date(left.data_alteracao || 0).getTime();
      const rightDate = new Date(right.data_alteracao || 0).getTime();
      return rightDate - leftDate;
    });
}

function mapDescriptionHistoryRows(notificationRows) {
  return notificationRows
    .filter((row) => row.canal === DESCRIPTION_AUDIT_CHANNEL)
    .map((row) => {
      const parsed = parseDescriptionAuditType(row.tipo);

      if (!parsed) {
        return null;
      }

      return {
        id_historico: row.id_notificacao,
        id_os: row.id_os,
        id_funcionario: parsed.id_funcionario,
        origem: parsed.origem,
        data_alteracao: row.data_envio
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftDate = new Date(left.data_alteracao || 0).getTime();
      const rightDate = new Date(right.data_alteracao || 0).getTime();
      return rightDate - leftDate;
    });
}

function buildStatusUpdatePreview(historyRows) {
  return historyRows.map((entry) => {
    const isInitialStatus = !entry.status_anterior;

    return {
      id_notificacao: entry.id_historico,
      id_os: entry.id_os,
      tipo_evento: isInitialStatus ? 'Inicial' : 'Mudanca',
      tipo: isInitialStatus
        ? `Status inicial: ${entry.status_novo}`
        : `Status alterado: ${entry.status_anterior} -> ${entry.status_novo}`,
      data_envio: entry.data_alteracao,
      status_envio: isInitialStatus ? 'Inicial' : 'Registrado',
      canal: 'Historico de Status',
      status_anterior: entry.status_anterior,
      status_novo: entry.status_novo,
      id_funcionario: entry.id_funcionario,
      origem: entry.origem
    };
  });
}

function buildDescriptionUpdatePreview(historyRows) {
  return historyRows.map((entry) => ({
    id_notificacao: entry.id_historico,
    id_os: entry.id_os,
    tipo_evento: 'Descricao',
    tipo: 'Descricao do problema atualizada',
    data_envio: entry.data_alteracao,
    status_envio: 'Registrado',
    canal: 'Historico de OS',
    id_funcionario: entry.id_funcionario,
    origem: entry.origem
  }));
}

function buildPublicUpdatePreview({
  statusHistoryRows,
  descriptionHistoryRows
}) {
  return [
    ...buildStatusUpdatePreview(statusHistoryRows),
    ...buildDescriptionUpdatePreview(descriptionHistoryRows)
  ].sort((left, right) => {
    const leftDate = new Date(left.data_envio || 0).getTime();
    const rightDate = new Date(right.data_envio || 0).getTime();

    if (rightDate !== leftDate) {
      return rightDate - leftDate;
    }

    return Number(right.id_notificacao || 0) - Number(left.id_notificacao || 0);
  });
}

function buildFallbackStatusHistory(os) {
  const fallbackStatus = resolveCanonicalStatus(os?.status_os) || os?.status_os || null;

  if (!fallbackStatus) {
    return [];
  }

  return [
    {
      id_historico: null,
      id_os: os.id_os,
      status_anterior: null,
      status_novo: fallbackStatus,
      id_funcionario: os.id_funcionario || null,
      origem: 'abertura',
      data_alteracao: os.data_abertura || new Date()
    }
  ];
}

function ensureInitialHistoryEntry(historyRows, os) {
  if (!historyRows || historyRows.length === 0) {
    return buildFallbackStatusHistory(os);
  }

  const hasExplicitInitial = historyRows.some((entry) => !entry.status_anterior);
  if (hasExplicitInitial) {
    return historyRows;
  }

  const oldestEntry = historyRows[historyRows.length - 1];
  const inferredInitialStatus =
    resolveCanonicalStatus(oldestEntry?.status_anterior) ||
    oldestEntry?.status_anterior ||
    resolveCanonicalStatus(os?.status_os) ||
    os?.status_os ||
    null;

  if (!inferredInitialStatus) {
    return historyRows;
  }

  const syntheticInitialEntry = {
    id_historico: null,
    id_os: os.id_os,
    status_anterior: null,
    status_novo: inferredInitialStatus,
    id_funcionario: oldestEntry?.id_funcionario || os.id_funcionario || null,
    origem: 'abertura_sintetica',
    data_alteracao: os.data_abertura || oldestEntry?.data_alteracao || new Date()
  };

  return [...historyRows, syntheticInitialEntry].sort((left, right) => {
    const leftDate = new Date(left.data_alteracao || 0).getTime();
    const rightDate = new Date(right.data_alteracao || 0).getTime();
    return rightDate - leftDate;
  });
}

async function registerStatusHistoryLog({
  idOs,
  previousStatus,
  newStatus,
  actorId,
  origin
}) {
  try {
    await notificationModel.createNotification({
      id_os: idOs,
      tipo: buildStatusAuditType({
        previousStatus,
        newStatus,
        actorId,
        origin
      }),
      data_envio: new Date(),
      status_envio: 'Registrado',
      canal: STATUS_AUDIT_CHANNEL
    });
  } catch (historyLogError) {
    console.error(
      'Falha ao registrar historico de status no banco:',
      historyLogError.message
    );
  }
}

async function registerDescriptionHistoryLog({
  idOs,
  actorId,
  origin
}) {
  try {
    await notificationModel.createNotification({
      id_os: idOs,
      tipo: buildDescriptionAuditType({
        actorId,
        origin
      }),
      data_envio: new Date(),
      status_envio: 'Registrado',
      canal: DESCRIPTION_AUDIT_CHANNEL
    });
  } catch (historyLogError) {
    console.error(
      'Falha ao registrar historico de descricao no banco:',
      historyLogError.message
    );
  }
}

function normalizeStatusValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveCanonicalStatus(value) {
  const normalizedInput = normalizeStatusValue(value);

  for (const status of ALLOWED_STATUS) {
    if (normalizeStatusValue(status) === normalizedInput) {
      return status;
    }
  }

  if (LEGACY_STATUS_ALIASES.has(normalizedInput)) {
    return LEGACY_STATUS_ALIASES.get(normalizedInput);
  }

  return null;
}

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function buildPublicStatusPageUrl(req, idOs) {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.PUBLIC_OS_PAGE_BASE_URL ||
      process.env.FRONTEND_PUBLIC_URL ||
      process.env.APP_PUBLIC_URL
  );
  const originHeaderUrl = normalizeBaseUrl(req.get('origin'));
  const fallbackBaseUrl = normalizeBaseUrl(DEFAULT_PUBLIC_OS_PAGE_BASE_URL);
  const baseUrl = configuredBaseUrl || originHeaderUrl || fallbackBaseUrl;
  const accessToken = buildPublicAccessToken(idOs);

  if (baseUrl.toLowerCase().endsWith('/public/os')) {
    return `${baseUrl}/${idOs}?access_token=${encodeURIComponent(accessToken)}`;
  }

  return `${baseUrl}/public/os/${idOs}?access_token=${encodeURIComponent(accessToken)}`;
}

const patchStatusOs = async (req, res) => {
  try {
    const idOs = Number(req.params.id);
    const requestedStatus = String(req.body?.status_os || '').trim();

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS inválido' });
    }

    if (!requestedStatus) {
      return res.status(400).json({ message: 'status_os é obrigatório' });
    }

    const newStatus = resolveCanonicalStatus(requestedStatus);

    if (!newStatus) {
      return res.status(400).json({ message: 'status_os inválido' });
    }

    const currentRow = await model.getOSById(idOs);

    if (!currentRow) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    const currentStatus = resolveCanonicalStatus(currentRow.status_os);

    if (currentStatus === 'Concluido') {
      return res.status(409).json({
        message: 'OS concluida nao pode ser alterada'
      });
    }

    if (currentStatus === newStatus) {
      return res.status(409).json({
        message: 'status_os já está definido com esse valor'
      });
    }

    const completionDate = newStatus === 'Concluido' ? new Date() : null;
    const patchedRow = await model.patchStatusOs(idOs, newStatus, completionDate);

    if (!patchedRow) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    await registerStatusHistoryLog({
      idOs,
      previousStatus: currentStatus || currentRow.status_os,
      newStatus: patchedRow.status_os,
      actorId: req.auth?.sub || null,
      origin: 'manual'
    });

    const context = await model.getStatusNotificationContext(idOs);
    const equipmentName = context
      ? `${context.tipo} ${context.marca} ${context.modelo}`.trim()
      : null;
    const publicStatusUrl = buildPublicStatusPageUrl(req, idOs);

    const whatsappResult = await sendStatusNotification({
      phone: context?.telefone,
      clientName: context?.nome_cliente,
      osId: idOs,
      status: patchedRow.status_os,
      equipment: equipmentName,
      publicUrl: publicStatusUrl
    });

    await registerNotificationLog({
      idOs,
      statusOs: patchedRow.status_os,
      sent: whatsappResult.sent,
      channel: 'WhatsApp'
    });

    const emailResult = await sendStatusEmailNotification({
      email: context?.email,
      clientName: context?.nome_cliente,
      osId: idOs,
      status: patchedRow.status_os,
      equipment: equipmentName,
      publicUrl: publicStatusUrl,
      eventType: 'status_updated'
    });

    await registerNotificationLog({
      idOs,
      statusOs: patchedRow.status_os,
      sent: emailResult.sent,
      channel: 'Email'
    });

    return res.json({
      message: 'OS atualizada com sucesso',
      data: patchedRow,
      public_status_url: publicStatusUrl,
      notification: {
        channel: 'WhatsApp',
        sent: whatsappResult.sent,
        status: whatsappResult.status,
        public_url: publicStatusUrl
      },
      email_notification: {
        channel: 'Email',
        sent: emailResult.sent,
        status: emailResult.status,
        public_url: publicStatusUrl
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const patchLaborValue = async (req, res) => {
  try {
    const idOs = Number(req.params.id);
    const rawLaborValue = req.body?.valor_mao_obra;
    const laborValue = Number(rawLaborValue);

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS invalido' });
    }

    if (!Number.isFinite(laborValue) || laborValue < 0) {
      return res.status(400).json({ message: 'valor_mao_obra invalido' });
    }

    const patchedRow = await model.patchLaborValue(idOs, laborValue);

    if (!patchedRow) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    return res.status(200).json({
      message: 'Valor de mao de obra atualizado com sucesso',
      data: patchedRow
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const patchProblemDescription = async (req, res) => {
  try {
    const idOs = Number(req.params.id);
    const nextDescription = String(req.body?.descricao_problema || '').trim();

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS invalido' });
    }

    if (!nextDescription) {
      return res.status(400).json({ message: 'descricao_problema e obrigatoria' });
    }

    const currentRow = await model.getOSById(idOs);

    if (!currentRow) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    const currentStatus = resolveCanonicalStatus(currentRow.status_os);
    if (currentStatus === 'Concluido') {
      return res.status(409).json({
        message: 'OS concluida nao pode ser alterada'
      });
    }

    const currentDescription = String(currentRow.descricao_problema || '').trim();
    if (currentDescription === nextDescription) {
      return res.status(409).json({
        message: 'descricao_problema ja esta definida com esse valor'
      });
    }

    const patchedRow = await model.patchProblemDescription(idOs, nextDescription);

    if (!patchedRow) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    await registerDescriptionHistoryLog({
      idOs,
      actorId: req.auth?.sub || null,
      origin: 'manual'
    });

    const context = await model.getStatusNotificationContext(idOs);
    const equipmentName = context
      ? `${context.tipo} ${context.marca} ${context.modelo}`.trim()
      : null;
    const publicStatusUrl = buildPublicStatusPageUrl(req, idOs);

    const emailResult = await sendStatusEmailNotification({
      email: context?.email,
      clientName: context?.nome_cliente,
      osId: idOs,
      status: patchedRow.status_os,
      equipment: equipmentName,
      publicUrl: publicStatusUrl,
      eventType: 'description_updated',
      description: patchedRow.descricao_problema
    });

    await registerNotificationLog({
      idOs,
      statusOs: patchedRow.status_os,
      sent: emailResult.sent,
      channel: 'Email',
      tipo: 'Atualizacao de descricao do problema'
    });

    return res.status(200).json({
      message: 'Descricao do problema atualizada com sucesso',
      data: patchedRow,
      public_status_url: publicStatusUrl,
      email_notification: {
        channel: 'Email',
        sent: emailResult.sent,
        status: emailResult.status,
        public_url: publicStatusUrl
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const addPartToOS = async (req, res) => {
  try {
    const idOs = Number(req.params.id);
    const idPeca = Number(req.body?.id_peca);
    const quantidade = Number(req.body?.quantidade);
    const rawPrecoUnitario = req.body?.preco_unitario_cobrado;
    const hasCustomPrice = String(rawPrecoUnitario ?? '').trim() !== '';
    const precoUnitarioCobrado = hasCustomPrice ? Number(rawPrecoUnitario) : null;

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS invalido' });
    }

    if (!Number.isInteger(idPeca) || idPeca <= 0) {
      return res.status(400).json({ message: 'id_peca invalido' });
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return res.status(400).json({ message: 'quantidade invalida' });
    }

    if (hasCustomPrice && (!Number.isFinite(precoUnitarioCobrado) || precoUnitarioCobrado < 0)) {
      return res.status(400).json({ message: 'preco_unitario_cobrado invalido' });
    }

    const order = await model.getOSById(idOs);

    if (!order) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    const createdOsPart = await model.addPartToOS({
      id_os: idOs,
      id_peca: idPeca,
      quantidade,
      preco_unitario_cobrado: precoUnitarioCobrado
    });

    if (!createdOsPart) {
      return res.status(404).json({ message: 'Peca nao encontrada' });
    }

    const updatedOrder = await model.getOSById(idOs);

    return res.status(201).json({
      message: 'Peca adicionada a OS com sucesso',
      data: createdOsPart,
      os: updatedOrder
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getPublicOS = async (req, res) => {
  try {
    const idOs = Number(req.params.id);

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS invalido' });
    }

    if (!requirePublicAccessToken(req, res, idOs)) {
      return;
    }

    const os = await model.getPublicOS(idOs);

    if (!os) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    res.status(200).json(os);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPublicOSPhotos = async (req, res) => {
  try {
    const idOs = Number(req.params.id);

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS inválido' });
    }

    if (!requirePublicAccessToken(req, res, idOs)) {
      return;
    }

    const os = await model.getPublicOS(idOs);

    if (!os) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    const photos = await photoModel.getPhotosByOS(idOs);

    return res.status(200).json({
      id_os: idOs,
      photos
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

async function fetchStatusHistoryForOS(idOs) {
  const os = await model.getOSById(idOs);

  if (!os) {
    return { os: null, history: [], notificationRows: [] };
  }

  const notificationRows = await notificationModel.getNotificationsByOS(idOs);
  const mappedHistory = mapStatusHistoryRows(notificationRows);
  const history = ensureInitialHistoryEntry(mappedHistory, os);

  return { os, history, notificationRows };
}

const getStatusHistoryByOS = async (req, res) => {
  try {
    const idOs = Number(req.params.id);

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS invalido' });
    }

    const { os, history } = await fetchStatusHistoryForOS(idOs);

    if (!os) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    return res.status(200).json({
      id_os: idOs,
      history
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getPublicOSUpdates = async (req, res) => {
  try {
    const idOs = Number(req.params.id);

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS inválido' });
    }

    if (!requirePublicAccessToken(req, res, idOs)) {
      return;
    }

    const { os, history, notificationRows } = await fetchStatusHistoryForOS(idOs);

    if (!os) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    const descriptionHistory = mapDescriptionHistoryRows(notificationRows || []);

    return res.status(200).json({
      id_os: idOs,
      updates: buildPublicUpdatePreview({
        statusHistoryRows: history,
        descriptionHistoryRows: descriptionHistory
      })
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getTotalValueOS = async (req, res) => {
  try {
    const getTotalValue = model.getTotalValueOs || model.getValorTotalOs;

    if (!getTotalValue) {
      return res.status(500).json({ message: 'Função de total da OS não disponível' });
    }

    const data = await getTotalValue(req.params.id);

    if (!data) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const generatePDF = async (req, res) => {
  try {
    const data = await model.getOSFull(req.params.id);

    if (data.length === 0) {
      return res.status(404).json({ message: 'OS não encontrada' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=os.pdf');
    doc.pipe(res);

    const os = data[0];
    const pageWidth = doc.page.width - 100;

    doc.rect(0, 0, doc.page.width, 80).fill('#1a73e8');

    doc.fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('ORDEM DE SERVIÇO', 50, 25, { align: 'left' });

    doc.fontSize(13)
      .font('Helvetica')
      .text(`#${os.id_os}`, 50, 52, { align: 'left' });

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.fontSize(10).text(`Emitido em: ${dataAtual}`, 0, 35, {
      align: 'right',
      width: doc.page.width - 50
    });

    doc.moveDown(3);

    const y1 = 105;
    doc.rect(50, y1, pageWidth, 28).fill('#f0f4ff').stroke('#d0d8f0');

    doc.fillColor('#1a73e8')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('DADOS DO CLIENTE E EQUIPAMENTO', 60, y1 + 8);

    doc.fillColor('#222222').font('Helvetica').fontSize(10);

    const infoY = y1 + 38;
    doc.font('Helvetica-Bold').text('Cliente:', 50, infoY);
    doc.font('Helvetica').text(os.cliente, 110, infoY);

    doc.font('Helvetica-Bold').text('Equipamento:', 50, infoY + 18);
    doc.font('Helvetica').text(`${os.tipo} ${os.marca} ${os.modelo}`, 130, infoY + 18);

    doc.font('Helvetica-Bold').text('Problema:', 50, infoY + 36);
    doc.font('Helvetica').text(os.descricao_problema, 115, infoY + 36, {
      width: pageWidth - 65
    });

    const y2 = infoY + 75;

    doc.rect(50, y2, pageWidth, 28).fill('#f0f4ff').stroke('#d0d8f0');
    doc.fillColor('#1a73e8')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('PEÇAS UTILIZADAS', 60, y2 + 8);

    const tableTop = y2 + 38;
    const colDesc = 50;
    const colQtd = 340;
    const colUnit = 400;
    const colTotal = 470;

    doc.rect(50, tableTop, pageWidth, 22).fill('#1a73e8');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Descricao', colDesc + 5, tableTop + 6);
    doc.text('Qtd', colQtd, tableTop + 6);
    doc.text('Vlr Unit.', colUnit, tableTop + 6);
    doc.text('Total', colTotal, tableTop + 6);

    let currentY = tableTop + 22;
    const pecas = data.filter((item) => item.nome_peca);

    pecas.forEach((item, index) => {
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f7f9ff';
      doc.rect(50, currentY, pageWidth, 20).fill(rowBg).stroke('#e0e6f0');

      const subtotal = (item.quantidade * item.preco_unitario_cobrado).toFixed(2);

      doc.fillColor('#333333').font('Helvetica').fontSize(9);
      doc.text(item.nome_peca, colDesc + 5, currentY + 5, { width: 280 });
      doc.text(String(item.quantidade), colQtd, currentY + 5);
      doc.text(`R$ ${Number(item.preco_unitario_cobrado).toFixed(2)}`, colUnit, currentY + 5);
      doc.text(`R$ ${subtotal}`, colTotal, currentY + 5);

      currentY += 20;
    });

    if (pecas.length === 0) {
      doc.rect(50, currentY, pageWidth, 20).fill('#ffffff').stroke('#e0e6f0');
      doc.fillColor('#999999').font('Helvetica-Oblique').fontSize(9)
        .text('Nenhuma peça registrada.', colDesc + 5, currentY + 5);
      currentY += 20;
    }

    const totalY = currentY + 20;

    doc.rect(50, totalY, pageWidth, 22).fill('#f0f4ff').stroke('#d0d8f0');
    doc.fillColor('#333333').font('Helvetica').fontSize(10)
      .text('Mão de obra:', colDesc + 5, totalY + 6);
    doc.font('Helvetica-Bold')
      .text(`R$ ${Number(os.valor_mao_obra).toFixed(2)}`, 0, totalY + 6, {
        align: 'right',
        width: doc.page.width - 60
      });

    doc.rect(50, totalY + 22, pageWidth, 28).fill('#1a73e8').stroke('#1a73e8');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
      .text('TOTAL:', colDesc + 5, totalY + 30);
    doc.text(`R$ ${Number(os.valor_total).toFixed(2)}`, 0, totalY + 30, {
      align: 'right',
      width: doc.page.width - 60
    });

    const footerY = doc.page.height - 50;
    doc.rect(0, footerY, doc.page.width, 50).fill('#f5f5f5');
    doc.fillColor('#999999').font('Helvetica').fontSize(8)
      .text('Documento gerado automaticamente pelo sistema de gestão de OS.', 50, footerY + 18, {
        align: 'center',
        width: pageWidth
      });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllOS,
  getOSByFilters,
  getOSById,
  createOS,
  patchStatusOs,
  patchLaborValue,
  patchProblemDescription,
  addPartToOS,
  getPublicOS,
  getPublicOSPhotos,
  getStatusHistoryByOS,
  getPublicOSUpdates,
  getTotalValueOS,
  generatePDF
};
