const pool = require('../db/db');


async function getTotalRevenue() {
  const { rows } = await pool.query(`
    SELECT COALESCE(SUM(valor),0) AS total
    FROM pagamento
    WHERE status_pagamento = 'Confirmado'
  `);

  return rows[0];
}


async function getMonthlyRevenue() {
  const { rows } = await pool.query(`
    SELECT 
      DATE_TRUNC('month', data_confirmacao) AS month,
      COALESCE(SUM(valor),0) AS total
    FROM pagamento
    WHERE status_pagamento = 'Confirmado'
    GROUP BY month
    ORDER BY month
  `);

  return rows;
}


async function getOrdersByStatus() {
  const { rows } = await pool.query(`
    SELECT 
      status_os,
      COUNT(*) AS quantity
    FROM os
    GROUP BY status_os
    ORDER BY quantity DESC
  `);

  return rows;
}


async function getMostUsedParts() {
  const { rows } = await pool.query(`
    SELECT 
      peca.nome_peca,
      SUM(os_peca.quantidade) AS total
    FROM os_peca
    JOIN peca ON os_peca.id_peca = peca.id_peca
    GROUP BY peca.nome_peca
    ORDER BY total DESC
  `);

  return rows;
}

async function getRevenueByPeriod(startDate, endDate) {
  const { rows } = await pool.query(`
    SELECT 
      COALESCE(SUM(valor),0) AS total
    FROM pagamento
    WHERE status_pagamento = 'Confirmado'
      AND data_confirmacao BETWEEN $1 AND $2
  `, [startDate, endDate]);

  return rows[0];
}


async function getOrdersSummary() {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status_os = 'Aberto') AS open,
      COUNT(*) FILTER (WHERE status_os = 'Concluida') AS completed,
      COUNT(*) AS total
    FROM os
  `);

  return rows[0];
}


async function getAverageTicket() {
  const { rows } = await pool.query(`
    SELECT 
      COALESCE(AVG(valor_total),0) AS average_ticket
    FROM os
  `);

  return rows[0];
}

async function getAllOrders() {
  const { rows } = await pool.query(`
    SELECT
      os.id_os,
      os.descricao_problema,
      os.valor_mao_obra,
      os.valor_total,
      os.status_os,
      os.data_abertura,
      cliente.nome AS cliente,
      equipamento.tipo,
      equipamento.marca,
      equipamento.modelo,
      peca.nome_peca,
      os_peca.quantidade,
      os_peca.preco_unitario_cobrado
    FROM os
    JOIN equipamento ON os.id_equipamento = equipamento.id_equipamento
    JOIN cliente ON equipamento.id_cliente = cliente.id_cliente
    LEFT JOIN os_peca ON os.id_os = os_peca.id_os
    LEFT JOIN peca ON os_peca.id_peca = peca.id_peca
    ORDER BY os.id_os DESC
  `);

  return rows;
}


module.exports = {
  getTotalRevenue,
  getMonthlyRevenue,
  getOrdersByStatus,
  getMostUsedParts,
  getRevenueByPeriod,
  getOrdersSummary,
  getAverageTicket,
  getAllOrders
};