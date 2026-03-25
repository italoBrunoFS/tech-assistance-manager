const PDFDocument = require('pdfkit');
const model = require('../models/osModel');

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

    if (!order)
      return res.status(404).json({ message: 'OS não encontrada' });

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

const patchStatusOs = async (req, res) => {
  try{
    const patchedRow = await model.patchStatusOs(req.params.id, req.body.status_os);

    if(!patchedRow){
      return res.status(404).json({message: "Os não encontrado"});
    }
    res.json({message: "Os atualizado com sucesso", data: patchedRow});
  }
  catch (err){
    res.status(500).json({error: err.message});
  }
}

const getPublicOS = async (req,res)=>{

 try{

   const os = await model.getPublicOS(req.params.id)

   if(!os)
     return res.status(404).json({message:"OS não encontrada"})

   res.status(200).json(os)

 }catch(err){

   res.status(500).json({error: err.message})

 }

}

const getTotalValueOS = async (req,res)=>{

 try{

  const data = await model.getValorTotalOs(req.params.id)

  if(!data)
    return res.status(404).json({message:"OS não encontrada"})

  res.json({data})

 }catch(err){

  res.status(500).json({error: err.message})

 }

}


const generatePDF = async (req, res) => {
  try {
    const data = await model.getOSFull(req.params.id);

    if (data.length === 0)
      return res.status(404).json({ message: 'OS não encontrada' });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=os.pdf');
    doc.pipe(res);

    const os = data[0];
    const pageWidth = doc.page.width - 100; // considerando margens

    // ─── CABEÇALHO ───────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill('#1a73e8');

    doc.fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('ORDEM DE SERVIÇO', 50, 25, { align: 'left' });

    doc.fontSize(13)
      .font('Helvetica')
      .text(`#${os.id_os}`, 50, 52, { align: 'left' });

    // Data no canto direito do cabeçalho
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.fontSize(10).text(`Emitido em: ${dataAtual}`, 0, 35, {
      align: 'right',
      width: doc.page.width - 50,
    });

    doc.moveDown(3);

    // ─── SEÇÃO: DADOS DO CLIENTE ─────────────────────────────────
    const y1 = 105;

    // Fundo cinza claro
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
      width: pageWidth - 65,
    });

    // ─── SEÇÃO: PEÇAS ────────────────────────────────────────────
    const y2 = infoY + 75;

    doc.rect(50, y2, pageWidth, 28).fill('#f0f4ff').stroke('#d0d8f0');
    doc.fillColor('#1a73e8')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('PEÇAS UTILIZADAS', 60, y2 + 8);

    // Cabeçalho da tabela
    const tableTop = y2 + 38;
    const colDesc = 50;
    const colQtd = 340;
    const colUnit = 400;
    const colTotal = 470;

    doc.rect(50, tableTop, pageWidth, 22).fill('#1a73e8');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Descrição', colDesc + 5, tableTop + 6);
    doc.text('Qtd', colQtd, tableTop + 6);
    doc.text('Vlr Unit.', colUnit, tableTop + 6);
    doc.text('Total', colTotal, tableTop + 6);

    // Linhas das peças
    let currentY = tableTop + 22;
    const pecas = data.filter(item => item.nome_peca);

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

    // ─── SEÇÃO: TOTAIS ───────────────────────────────────────────
    const totalY = currentY + 20;

    // Mão de obra
    doc.rect(50, totalY, pageWidth, 22).fill('#f0f4ff').stroke('#d0d8f0');
    doc.fillColor('#333333').font('Helvetica').fontSize(10)
      .text('Mão de obra:', colDesc + 5, totalY + 6);
    doc.font('Helvetica-Bold')
      .text(`R$ ${Number(os.valor_mao_obra).toFixed(2)}`, 0, totalY + 6, {
        align: 'right', width: doc.page.width - 60,
      });

    // Total geral
    doc.rect(50, totalY + 22, pageWidth, 28).fill('#1a73e8').stroke('#1a73e8');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
      .text('TOTAL:', colDesc + 5, totalY + 30);
    doc.text(`R$ ${Number(os.valor_total).toFixed(2)}`, 0, totalY + 30, {
      align: 'right', width: doc.page.width - 60,
    });

    // ─── RODAPÉ ──────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY, doc.page.width, 50).fill('#f5f5f5');
    doc.fillColor('#999999').font('Helvetica').fontSize(8)
      .text('Documento gerado automaticamente pelo sistema de gestão de OS.', 50, footerY + 18, {
        align: 'center', width: pageWidth,
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
