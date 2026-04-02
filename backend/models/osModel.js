const pool = require('../db/db');

async function getAllOS() {
  const { rows } = await pool.query(`SELECT * FROM os`);
  return rows;
}

async function getOSById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM os WHERE id_os = $1`,
    [id]
  );
  return rows[0];
}

async function patchStatusOs(id, status){
  const {rows} = await pool.query('UPDATE os SET status_os = $1 WHERE id_os = $2 RETURNING *', [status, id]);
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
  status_os,
  id_funcionario,
  id_equipamento
}) {

  const { rows } = await pool.query(
    `INSERT INTO os
    (descricao_problema,data_abertura,status_os,id_funcionario,id_equipamento)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *`,
    [
      descricao_problema,
      data_abertura,
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
  getOSById,
  createOS,
  patchStatusOs,
  getStatusNotificationContext,
  getPublicOS,
  getTotalValueOs,
  getOSFull
};
