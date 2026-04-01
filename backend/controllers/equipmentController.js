const model = require('../models/equipmentModel');

function normalizeSerial(rawSerial) {
  return String(rawSerial || '').trim().toUpperCase();
}

const getAllEquipments = async (req, res) => {
  try {
    const equipments = await model.getAllEquipments();
    res.status(200).json(equipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEquipmentById = async (req, res) => {
  try {
    const equipment = await model.getEquipmentById(req.params.id);

    if (!equipment)
      return res.status(404).json({ message: 'Equipamento nao encontrado' });

    res.status(200).json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEquipment = async (req, res) => {
  try {
    const serial = normalizeSerial(req.body?.serial);

    if (!serial) {
      return res.status(400).json({ message: 'Serial obrigatorio para cadastrar equipamento' });
    }

    const existingEquipment = await model.getEquipmentBySerial(serial);

    if (existingEquipment) {
      return res.status(409).json({ message: 'Ja existe um equipamento com esse serial' });
    }

    const equipment = await model.createEquipment({
      ...req.body,
      serial
    });
    res.status(201).json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateEquipment = async (req, res) => {
  try {
    const serial = normalizeSerial(req.body?.serial);

    if (!serial) {
      return res.status(400).json({ message: 'Serial obrigatorio para atualizar equipamento' });
    }

    const existingEquipment = await model.getEquipmentBySerial(serial);

    if (existingEquipment && String(existingEquipment.id_equipamento) !== String(req.params.id)) {
      return res.status(409).json({ message: 'Ja existe um equipamento com esse serial' });
    }

    const updated = await model.updateEquipment(req.params.id, {
      ...req.body,
      serial
    });

    if (!updated)
      return res.status(404).json({ message: 'Equipamento nao encontrado' });

    res.json({
      message: 'Equipamento atualizado com sucesso',
      updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteEquipment = async (req, res) => {
  try {
    const deleted = await model.deleteEquipment(req.params.id);

    if (!deleted)
      return res.status(404).json({ message: 'Equipamento nao encontrado' });

    res.json({ message: 'Equipamento removido', deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHistoryById = async (req, res) => {
  try {
    const history = await model.getHistoryById(req.params.id);

    if (!history || history.length === 0) {
      return res.status(404).json({ message: 'Nao ha historico para esse equipamento' });
    }

    return res.json({ history });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getHistoryBySerial = async (req, res) => {
  try {
    const serial = String(req.params.serial || '').trim();

    if (!serial) {
      return res.status(400).json({ message: 'Serial obrigatorio' });
    }

    const history = await model.getHistoryBySerial(serial);

    if (!history || history.length === 0) {
      return res.status(404).json({ message: 'Nao ha historico para esse serial' });
    }

    return res.json({ history });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllEquipments,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getHistoryById,
  getHistoryBySerial
};
