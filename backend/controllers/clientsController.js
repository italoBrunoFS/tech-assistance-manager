const model = require('../models/clientsModel');

const getAllClients = async (req, res) => {
  try {
    const clients = await model.getAllClients();
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await model.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createClient = async (req, res) => {
  try {
    const newClient = await model.createClient(req.body);
    res.status(201).json(newClient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const updated = await model.updateClient(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const patchClient = async (req, res) => {
  try {
    const patched = await model.patchClient(req.params.id, req.body);
    if (!patched) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const deleted = await model.deleteClient(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.json({ message: 'Cliente removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*const getClientByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email obrigatório' });
    }

    const client = await model.getClientByEmail(email);
    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};*/

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  patchClient,
  deleteClient,
  //getClientByEmail
};
