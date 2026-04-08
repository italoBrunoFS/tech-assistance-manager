const pool = require('../db/db');

async function getAllOS() {
  const { rows } = await pool.query(`SELECT * FROM os`);
  return rows;
}

async function getOSByFilters({
  id_os,
  status_os,
  id_equipamento,
  id_funcionario,
  data_from,
  data_to,
  descricao_problema,
  serial,
  cliente_nome
}) {
  const conditions = [];
  const values = [];

  function addCondition(condition, value) {
    values.push(value);
    conditions.push(condition.replace('?', `$${values.length}`));
  }

  if (id_os) {
    addCondition('os.id_os = ?', id_os);
  }

  if (status_os) {
    addCondition('os.status_os = ?', status_os);
  }

  if (id_equipamento) {
    addCondition('os.id_equipamento = ?', id_equipamento);
  }

  if (id_funcionario) {
    addCondition('os.id_funcionario = ?', id_funcionario);
  }

  if (data_from) {
    addCondition('os.data_abertura >= ?', data_from);
  }

  if (data_to) {
    addCondition('os.data_abertura <= ?', data_to);
  }

  if (descricao_problema) {
    addCondition('os.descricao_problema ILIKE ?', `%${descricao_problema}%`);
  }

  if (serial) {
    addCondition('equipamento.serial ILIKE ?', `%${serial}%`);
  }

  if (cliente_nome) {
    addCondition('cliente.nome ILIKE ?', `%${cliente_nome}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `
    SELECT os.*
    FROM os
    LEFT JOIN equipamento
      ON os.id_equipamento = equipamento.id_equipamento
    LEFT JOIN cliente
      ON equipamento.id_cliente = cliente.id_cliente
    ${whereClause}
    ORDER BY os.data_abertura DESC
    `,
    values
  );

  return rows;
}

async function getOSById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM os WHERE id_os = $1`,
    [id]
  );
  return rows[0];
}

async function patchStatusOs(id, status, dataConclusao){
  const {rows} = await pool.query(
    'UPDATE os SET status_os = $1, data_conclusao = $2 WHERE id_os = $3 RETURNING *',
    [status, dataConclusao, id]
  );
  return rows[0];
}

async function patchLaborValue(id, valorMaoObra) {
  const { rows } = await pool.query(
    `
    UPDATE os
    SET
      valor_mao_obra = $1,
      valor_total = $1 + COALESCE(
        (
          SELECT SUM(os_peca.quantidade * os_peca.preco_unitario_cobrado)
          FROM os_peca
          WHERE os_peca.id_os = $2
        ),
        0
      )
    WHERE id_os = $2
    RETURNING *
    `,
    [valorMaoObra, id]
  );

  return rows[0];
}

async function patchProblemDescription(id, descricaoProblema) {
  const { rows } = await pool.query(
    `
    UPDATE os
    SET descricao_problema = $1
    WHERE id_os = $2
    RETURNING *
    `,
    [descricaoProblema, id]
  );

  return rows[0];
}

async function addPartToOS({
  id_os,
  id_peca,
  quantidade,
  preco_unitario_cobrado
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO os_peca (id_os, id_peca, quantidade, preco_unitario_cobrado)
    SELECT
      $1,
      peca.id_peca,
      $3,
      COALESCE($4, peca.preco_unit)
    FROM peca
    WHERE peca.id_peca = $2
    RETURNING *
    `,
    [id_os, id_peca, quantidade, preco_unitario_cobrado]
  );

  return rows[0];
}

async function getStatusNotificationContext(id) {
  const { rows } = await pool.query(
    `
    SELECT
      os.id_os,
      os.status_os,
      cliente.nome AS nome_cliente,
      cliente.telefone,
      cliente.email,
      equipamento.tipo,
      equipamento.marca,
      equipamento.modelo
    FROM os
    JOIN equipamento
      ON os.id_equipamento = equipamento.id_equipamento
    JOIN cliente
      ON equipamento.id_cliente = cliente.id_cliente
    WHERE os.id_os = $1
    `,
    [id]
  );

  return rows[0];
}

async function createOS({
  descricao_problema,
  data_abertura,
  data_conclusao,
  status_os,
  id_funcionario,
  id_equipamento
}) {

  const { rows } = await pool.query(
    `INSERT INTO os
    (descricao_problema,data_abertura,data_conclusao,status_os,id_funcionario,id_equipamento)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *`,
    [
      descricao_problema,
      data_abertura,
      data_conclusao,
      status_os,
      id_funcionario,
      id_equipamento
    ]
  );

  return rows[0];
}

async function getPublicOS(id){

 const { rows } = await pool.query(
 `
 SELECT
 os.id_os,
 os.status_os,
 os.descricao_problema,
 os.data_abertura,
 equipamento.tipo,
 equipamento.marca,
 equipamento.modelo
 FROM os
 JOIN equipamento
 ON os.id_equipamento = equipamento.id_equipamento
 WHERE os.id_os = $1
 `,
 [id]
 )

 return rows[0]
}

async function getTotalValueOs(id) {
  const {rows} = await pool.query('SELECT valor_total FROM os WHERE id_os = $1', [id]);
  return rows[0];
}

async function getOSFull(id) {
  const { rows } = await pool.query(`SELECT 
os.id_os,
os.descricao_problema,
os.valor_mao_obra,
os.valor_total,
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
WHERE os.id_os = $1;`, [id]);
  return rows;
}

module.exports = {
  getAllOS,
  getOSByFilters,
  getOSById,
  createOS,
  patchStatusOs,
  patchLaborValue,
  patchProblemDescription,
  addPartToOS,
  getStatusNotificationContext,
  getPublicOS,
  getTotalValueOs,
  getOSFull
};
