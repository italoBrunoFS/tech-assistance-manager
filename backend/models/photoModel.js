const pool = require('../db/db');

async function getPhotosByOS(id_os) {
  const { rows } = await pool.query(
    `SELECT * FROM foto WHERE id_os = $1`,
    [id_os]
  );
  return rows;
}

async function getPhotoById(id_foto) {
  const { rows } = await pool.query(
    `SELECT * FROM foto WHERE id_foto = $1`,
    [id_foto]
  );
  return rows[0] || null;
}

async function createPhoto({ id_os, url_arquivo, data_upload }) {

  const { rows } = await pool.query(
    `INSERT INTO foto
    (id_os,url_arquivo,data_upload)
    VALUES ($1,$2,$3)
    RETURNING *`,
    [id_os, url_arquivo, data_upload]
  );

  return rows[0];
}

async function deletePhoto(id_foto) {
  const { rows } = await pool.query(
    `DELETE FROM foto WHERE id_foto = $1 RETURNING *`,
    [id_foto]
  );
  return rows[0] || null;
}

module.exports = {
  getPhotosByOS,
  getPhotoById,
  createPhoto,
  deletePhoto
};
