const pool = require('../db/db');
const { hashPassword, normalizeAccessLevel } = require('../utils/auth');

function sanitizeEmployee(row) {
  if (!row) {
    return null;
  }

  return {
    id_funcionario: row.id_funcionario,
    nome: row.nome,
    email: row.email,
    nivel_acesso: row.nivel_acesso,
    id_cargo: row.id_cargo
  };
}

function getRawPassword(input = {}) {
  return input.senha ?? input.senha_hash ?? null;
}

async function getAllEmployees() {
  const { rows } = await pool.query(
    `SELECT
       id_funcionario,
       nome,
       email,
       nivel_acesso,
       id_cargo
     FROM funcionario`
  );

  return rows.map(sanitizeEmployee);
}

async function getEmployeeById(id) {
  const { rows } = await pool.query(
    `SELECT
       id_funcionario,
       nome,
       email,
       nivel_acesso,
       id_cargo
     FROM funcionario
     WHERE id_funcionario = $1`,
    [id]
  );

  return sanitizeEmployee(rows[0]);
}

async function getEmployeeAuthByEmail(email) {
  const { rows } = await pool.query(
    `SELECT
       id_funcionario,
       nome,
       email,
       senha_hash,
       nivel_acesso,
       id_cargo
     FROM funcionario
     WHERE email = $1`,
    [email]
  );

  return rows[0];
}

async function countEmployees() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM funcionario');
  return rows[0].total;
}

async function createEmployee({
  nome,
  email,
  senha,
  senha_hash,
  nivel_acesso,
  id_cargo
}) {
  const rawPassword = getRawPassword({ senha, senha_hash });

  if (!rawPassword) {
    throw new Error('Senha obrigatoria');
  }

  const passwordHash = await hashPassword(rawPassword);
  const normalizedAccessLevel = normalizeAccessLevel(nivel_acesso || 'tecnico');

  const { rows } = await pool.query(
    `INSERT INTO funcionario
     (nome, email, senha_hash, nivel_acesso, id_cargo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id_funcionario,
       nome,
       email,
       nivel_acesso,
       id_cargo`,
    [
      nome,
      email,
      passwordHash,
      normalizedAccessLevel,
      id_cargo || null
    ]
  );

  return sanitizeEmployee(rows[0]);
}

async function updateEmployee(
  id,
  { nome, email, senha, senha_hash, nivel_acesso, id_cargo }
) {
  const rawPassword = getRawPassword({ senha, senha_hash });
  let query = `
    UPDATE funcionario
    SET nome = $1,
        email = $2,
        nivel_acesso = $3,
        id_cargo = $4`;

  const params = [
    nome,
    email,
    normalizeAccessLevel(nivel_acesso || 'tecnico'),
    id_cargo || null
  ];

  let index = 5;

  if (rawPassword) {
    const passwordHash = await hashPassword(rawPassword);
    query += `, senha_hash = $${index}`;
    params.push(passwordHash);
    index++;
  }

  query += `
      WHERE id_funcionario = $${index}
      RETURNING
        id_funcionario,
        nome,
        email,
        nivel_acesso,
        id_cargo`;
  params.push(id);

  const { rows } = await pool.query(query, params);
  return sanitizeEmployee(rows[0]);
}

async function patchEmployee(id, fields) {
  const allowedFields = ['nome', 'email', 'nivel_acesso', 'id_cargo'];
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      const normalizedValue = key === 'nivel_acesso'
        ? normalizeAccessLevel(value)
        : value;
      updates.push(`${key} = $${updates.length + 1}`);
      values.push(normalizedValue);
    }
  });

  const rawPassword = getRawPassword(fields);

  if (rawPassword) {
    const passwordHash = await hashPassword(rawPassword);
    updates.push(`senha_hash = $${updates.length + 1}`);
    values.push(passwordHash);
  }

  if (updates.length === 0) {
    return false;
  }

  values.push(id);

  const { rows } = await pool.query(
    `UPDATE funcionario
     SET ${updates.join(', ')}
     WHERE id_funcionario = $${updates.length + 1}
     RETURNING
       id_funcionario,
       nome,
       email,
       nivel_acesso,
       id_cargo`,
    values
  );

  return sanitizeEmployee(rows[0]);
}

async function updateEmployeePasswordHash(id, passwordHash) {
  const { rowCount } = await pool.query(
    `UPDATE funcionario
     SET senha_hash = $1
     WHERE id_funcionario = $2`,
    [passwordHash, id]
  );

  return rowCount > 0;
}

async function deleteEmployee(id) {
  const result = await pool.query(
    `DELETE FROM funcionario WHERE id_funcionario = $1`,
    [id]
  );

  return result.rowCount > 0;
}

module.exports = {
  countEmployees,
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployeeAuthByEmail,
  getEmployeeById,
  patchEmployee,
  updateEmployee,
  updateEmployeePasswordHash
};
