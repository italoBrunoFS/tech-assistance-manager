const pool = require('../db/db');

async function getAllClients() {
  const { rows } = await pool.query(`
    SELECT 
      id_cliente,
      nome,
      cpf,
      telefone,
      email,
      rua,
      bairro,
      numero,
      cep,
      complemento
    FROM cliente
  `);

  return rows;
}

async function getClientById(id) {
  const { rows } = await pool.query(
    `SELECT 
      id_cliente,
      nome,
      cpf,
      telefone,
      email,
      rua,
      bairro,
      numero,
      cep,
      complemento
     FROM cliente
     WHERE id_cliente = $1`,
    [id]
  );

  return rows[0];
}

async function createClient({
  nome,
  cpf,
  telefone,
  email,
  rua,
  bairro,
  numero,
  cep,
  complemento
}) {

  const { rows } = await pool.query(
    `INSERT INTO cliente
      (nome, cpf, telefone, email, rua, bairro, numero, cep, complemento)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      nome,
      cpf,
      telefone,
      email,
      rua,
      bairro,
      numero,
      cep,
      complemento
    ]
  );

  return rows[0];
}

async function updateClient(id, {
  nome,
  cpf,
  telefone,
  email,
  rua,
  bairro,
  numero,
  cep,
  complemento
}) {

  const {rows} = await pool.query(
    `UPDATE cliente
     SET nome = $1,
         cpf = $2,
         telefone = $3,
         email = $4,
         rua = $5,
         bairro = $6,
         numero = $7,
         cep = $8,
         complemento = $9
     WHERE id_cliente = $10
     RETURNING *`,
    [
      nome,
      cpf,
      telefone,
      email,
      rua,
      bairro,
      numero,
      cep,
      complemento,
      id
    ]
  );

  return rows[0];
}

async function patchClient(id, fields) {

  const keys = Object.keys(fields);
  const values = Object.values(fields);

  if (keys.length === 0) return false;

  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');

  const {rows} = await pool.query(
    `UPDATE cliente
     SET ${setClause}
     WHERE id_cliente = $${keys.length + 1}
     RETURNING *`,
    [...values, id]
  );

  return rows[0];
}

async function deleteClient(id) {

  const {rows} = await pool.query(
    `DELETE FROM cliente WHERE id_cliente = $1
    RETURNING *`,
    [id]
  );

  return rows[0];
}

async function getClientByEmail(email) {
  const {rows} = await pool.query('SELECT * FROM cliente WHERE email = $1', [email]);
  return rows[0];
}

async function getClientByPhone(telefone) {
  const rawPhone = String(telefone || '').trim();
  const phoneDigits = rawPhone.replace(/\D/g, '');

  if (!rawPhone) {
    return [];
  }

  if (phoneDigits) {
    const { rows } = await pool.query(
      `
      SELECT
        id_cliente,
        nome,
        cpf,
        telefone,
        email,
        rua,
        bairro,
        numero,
        cep,
        complemento
      FROM cliente
      WHERE regexp_replace(telefone, '\\D', '', 'g') LIKE $1 || '%'
      ORDER BY nome ASC
      `,
      [phoneDigits]
    );

    return rows;
  }

  const { rows } = await pool.query(
    `
    SELECT
      id_cliente,
      nome,
      cpf,
      telefone,
      email,
      rua,
      bairro,
      numero,
      cep,
      complemento
    FROM cliente
    WHERE telefone ILIKE $1
    ORDER BY nome ASC
    `,
    [`${rawPhone}%`]
  );

  return rows;
}

async function getClientsByName(nome) {
  const { rows } = await pool.query(
    `
    SELECT
      id_cliente,
      nome,
      cpf,
      telefone,
      email,
      rua,
      bairro,
      numero,
      cep,
      complemento
    FROM cliente
    WHERE nome ILIKE $1
    ORDER BY nome ASC
    `,
    [`%${nome}%`]
  );

  return rows;
}


module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  patchClient,
  deleteClient,
  getClientByEmail,
  getClientByPhone,
  getClientsByName
};
