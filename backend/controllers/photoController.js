const fs = require('fs/promises');
const path = require('path');
const model = require('../models/photoModel');

const managedUploadsDirectory = path.resolve(__dirname, '..', 'uploads', 'photos');

function resolveManagedPhotoPath(urlArquivo) {
  const normalizedUrl = String(urlArquivo || '').replace(/\\/g, '/');

  if (!normalizedUrl.startsWith('/uploads/photos/')) {
    return null;
  }

  const relativePath = normalizedUrl.replace(/^\/+/, '');
  const absolutePath = path.resolve(__dirname, '..', relativePath);
  const relativeToUploads = path.relative(managedUploadsDirectory, absolutePath);

  if (relativeToUploads.startsWith('..') || path.isAbsolute(relativeToUploads)) {
    return null;
  }

  return absolutePath;
}

const getPhotosByOS = async (req, res) => {
  try {
    const photos = await model.getPhotosByOS(req.params.id);
    res.status(200).json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPhoto = async (req, res) => {
  try {
    const photo = await model.createPhoto(req.body);
    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const uploadPhoto = async (req, res) => {
  try {
    const idOs = Number(req.body?.id_os);

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'id_os obrigatório para upload' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo de imagem obrigatório' });
    }

    const photo = await model.createPhoto({
      id_os: idOs,
      url_arquivo: `/uploads/photos/${req.file.filename}`,
      data_upload: req.body?.data_upload || new Date()
    });

    return res.status(201).json(photo);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const deletePhoto = async (req, res) => {
  try {
    const idFoto = Number(req.params.id);

    if (!Number.isInteger(idFoto) || idFoto <= 0) {
      return res.status(400).json({ message: 'id_foto invalido' });
    }

    const existingPhoto = await model.getPhotoById(idFoto);
    if (!existingPhoto) {
      return res.status(404).json({ message: 'Foto nao encontrada' });
    }

    const deletedPhoto = await model.deletePhoto(idFoto);
    if (!deletedPhoto) {
      return res.status(404).json({ message: 'Foto nao encontrada' });
    }

    const localFilePath = resolveManagedPhotoPath(existingPhoto.url_arquivo);
    if (localFilePath) {
      try {
        await fs.unlink(localFilePath);
      } catch (fileError) {
        if (fileError.code !== 'ENOENT') {
          console.error('Falha ao remover arquivo de foto:', fileError.message);
        }
      }
    }

    return res.status(200).json({
      message: 'Foto removida com sucesso',
      data: deletedPhoto
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getPhotosByOS,
  createPhoto,
  uploadPhoto,
  deletePhoto
};
