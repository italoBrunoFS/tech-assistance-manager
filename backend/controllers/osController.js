const PDFDocument = require('pdfkit');
const model = require('../models/osModel');
const notificationModel = require('../models/notificationModel');
const { sendStatusNotification } = require('../services/whatsappService');
const { sendStatusEmailNotification } = require('../services/emailService');

const ALLOWED_STATUS = new Set([
  'Aberto',
  'Em Analise',
  'Em Analise Tecnica',
  'Em Analise T\u00e9cnica',
  'Em Conserto',
  'Concluida',
  'Conclu\u00edda',
  'Cancelada'
]);

const getAllOS = async (req, res) => {
  try {
    const orders = await model.getAllOS();
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOSById = async (req, res) => {
  try {
    const order = await model.getOSById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createOS = async (req, res) => {
  try {
    const order = await model.createOS(req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function registerNotificationLog({
  idOs,
  statusOs,
  sent,
  channel
}) {
  try {
    await notificationModel.createNotification({
      id_os: idOs,
      tipo: `Mudanca de status para ${statusOs}`,
      data_envio: new Date(),
      status_envio: sent ? 'Enviado' : 'Falha',
      canal: channel
    });
  } catch (notificationLogError) {
    console.error(
      `Falha ao registrar notificacao ${channel} no banco:`,
      notificationLogError.message
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

const patchStatusOs = async (req, res) => {
  try {
    const idOs = Number(req.params.id);
    const newStatus = String(req.body?.status_os || '').trim();

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'ID da OS invalido' });
    }

    if (!newStatus) {
      return res.status(400).json({ message: 'status_os e obrigatorio' });
    }

    if (!ALLOWED_STATUS.has(newStatus)) {
      return res.status(400).json({ message: 'status_os invalido' });
    }

    const currentRow = await model.getOSById(idOs);

    if (!currentRow) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    if (
      normalizeStatusValue(currentRow.status_os) ===
      normalizeStatusValue(newStatus)
    ) {
      return res.status(409).json({
        message: 'status_os ja esta definido com esse valor'
      });
    }

    const patchedRow = await model.patchStatusOs(idOs, newStatus);

    if (!patchedRow) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    const context = await model.getStatusNotificationContext(idOs);
    const equipmentName = context
      ? `${context.tipo} ${context.marca} ${context.modelo}`.trim()
      : null;

    const whatsappResult = await sendStatusNotification({
      phone: context?.telefone,
      clientName: context?.nome_cliente,
      osId: idOs,
      status: patchedRow.status_os,
      equipment: equipmentName
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
      equipment: equipmentName
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
      notification: {
        channel: 'WhatsApp',
        sent: whatsappResult.sent,
        status: whatsappResult.status
      },
      email_notification: {
        channel: 'Email',
        sent: emailResult.sent,
        status: emailResult.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPublicOS = async (req, res) => {
  try {
    const os = await model.getPublicOS(req.params.id);

    if (!os) {
      return res.status(404).json({ message: 'OS nao encontrada' });
    }

    res.status(200).json(os);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTotalValueOS = async (req, res) => {
  try {
    const getTotalValue = model.getTotalValueOs || model.getValorTotalOs;

    if (!getTotalValue) {
      return res.status(500).json({ message: 'Funcao de total da OS nao disponivel' });
    }

    const data = await getTotalValue(req.params.id);

    if (!data) {
      return res.status(404).json({ message: 'OS nao encontrada' });
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
      return res.status(404).json({ message: 'OS nao encontrada' });
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
      .text('ORDEM DE SERVICO', 50, 25, { align: 'left' });

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
      .text('PECAS UTILIZADAS', 60, y2 + 8);

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
        .text('Nenhuma peca registrada.', colDesc + 5, currentY + 5);
      currentY += 20;
    }

    const totalY = currentY + 20;

    doc.rect(50, totalY, pageWidth, 22).fill('#f0f4ff').stroke('#d0d8f0');
    doc.fillColor('#333333').font('Helvetica').fontSize(10)
      .text('Mao de obra:', colDesc + 5, totalY + 6);
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
      .text('Documento gerado automaticamente pelo sistema de gestao de OS.', 50, footerY + 18, {
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
  getOSById,
  createOS,
  patchStatusOs,
  getPublicOS,
  getTotalValueOS,
  generatePDF
};
