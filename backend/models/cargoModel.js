const pool = require('../db/db');
const { isValidAccessLevel, toAccessLevelCode } = require('../utils/auth');

async function getAllCargos() {
  const { rows } = await pool.query(`SELECT * FROM cargo`);
  return rows;
}

async function createCargo({ nome_cargo, nivel_acesso }) {
  if (!isValidAccessLevel(nivel_acesso)) {
    throw new Error('nivel_acesso invalido. Use um numero inteiro maior ou igual a 1');
  }

  const accessLevelCode = toAccessLevelCode(nivel_acesso);

  const { rows } = await pool.query(
    `INSERT INTO cargo
    (nome_cargo,nivel_acesso)
    VALUES ($1,$2)
    RETURNING *`,
    [nome_cargo, accessLevelCode]
  );

  return rows[0];
}

module.exports = {
  getAllCargos,
  createCargo
};
