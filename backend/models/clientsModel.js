const pool = require('../db/db');

async function getAllClients(){
  const { rows } = await pool.query('SELECT * FROM cliente');
  return rows;
}

async function getClientById(id) {
  const { rows } = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);
  return rows[0];
}

async function createClient({
  nome,
  cpf_cnpj,
  email,
  telefone,
  bairro,
  rua,
  complemento,
  numero
}) {
  const { rows } = await pool.query(
    `INSERT INTO cliente 
     (nome, cpf_cnpj, email, telefone, bairro, rua, complemento, numero) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)RETURNING id_cliente`,
    [
      nome,
      cpf_cnpj,
      email,
      telefone,
      bairro,
      rua,
      complemento,
      numero
    ]
  );

  return {
    id: rows[0].id_cliente,
    nome,
    cpf_cnpj,
    email,
    telefone,
    bairro,
    rua,
    complemento,
    numero
  };
}

async function updateClient(id, {
  nome,
  cpf_cnpj,
  email,
  telefone,
  bairro,
  rua,
  complemento,
  numero
}) {

  const result = await pool.query(
    `UPDATE cliente
     SET nome = $1,
         cpf_cnpj = $2,
         email = $3,
         telefone = $4,
         bairro = $5,
         rua = $6,
         complemento = $7,
         numero = $8
     WHERE id_cliente = $9`,
    [
      nome,
      cpf_cnpj,
      email,
      telefone,
      bairro,
      rua,
      complemento,
      numero,
      id
    ]
  );

  return result.rowCount > 0;
}

async function patchClient(id, fields) {

  const allowedFields = [
    'nome',
    'cpf_cnpj',
    'email',
    'telefone',
    'bairro',
    'rua',
    'complemento',
    'numero'
  ];

  const entries = Object.entries(fields)
    .filter(([key]) => allowedFields.includes(key));

  if (entries.length === 0) return false;

  const setClause = entries
    .map(([key], index) => `${key} = $${index + 1}`)
    .join(', ');

  const values = entries.map(([, value]) => value);

  const result = await pool.query(
    `UPDATE cliente SET ${setClause} WHERE id_cliente = $${entries.length + 1}`,
    [...values, id]
  );

  return result.rowCount > 0;
}

async function deleteClient(id) {

  const result = await pool.query(
    'DELETE FROM cliente WHERE id_cliente = $1',
    [id]
  );

  return result.rowCount > 0;
}

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  patchClient,
  deleteClient
};