const pool = require('../db/db');

async function getAllEquipments() {
  const { rows } = await pool.query(`SELECT * FROM equipamento`);
  return rows;
}

async function getEquipmentById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM equipamento WHERE id_equipamento = $1`,
    [id]
  );
  return rows[0];
}

async function getEquipmentBySerial(serial) {
  const { rows } = await pool.query(
    `SELECT * FROM equipamento WHERE serial = $1`,
    [serial]
  );
  return rows[0];
}

async function createEquipment({ tipo, marca, modelo, serial, id_cliente }) {
  const { rows } = await pool.query(
    `INSERT INTO equipamento (tipo, marca, modelo, serial, id_cliente)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [tipo, marca, modelo, serial, id_cliente]
  );
  return rows[0];
}

async function updateEquipment(id, { tipo, marca, modelo, serial, id_cliente }) {
  const {rows} = await pool.query(
    `UPDATE equipamento
     SET tipo = $1,
         marca = $2,
         modelo = $3,
         serial = $4,
         id_cliente = $5
     WHERE id_equipamento = $6
     RETURNING *`,
    [tipo, marca, modelo, serial, id_cliente, id]
  );
  return rows[0];
}

async function deleteEquipment(id) {
  const {rows} = await pool.query(
    `DELETE FROM equipamento WHERE id_equipamento = $1
    RETURNING *`,
    [id]
  );
  return rows[0];
}

async function getHistoryById(id){
  const {rows} = await pool.query('SELECT * FROM os WHERE id_equipamento = $1 ORDER BY data_abertura DESC', [id]);
  return rows;
}

async function getHistoryBySerial(serial) {
  const { rows } = await pool.query(
    `
    SELECT os.*
    FROM os
    JOIN equipamento
      ON os.id_equipamento = equipamento.id_equipamento
    WHERE equipamento.serial = $1
    ORDER BY os.data_abertura DESC
    `,
    [serial]
  );

  return rows;
}

module.exports = {
  getAllEquipments,
  getEquipmentById,
  getEquipmentBySerial,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getHistoryById,
  getHistoryBySerial
};
