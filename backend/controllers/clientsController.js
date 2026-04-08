const model = require('../models/clientsModel');

function normalizeCpf(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(value) {
  const cpf = normalizeCpf(value);

  if (cpf.length !== 11) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) {
    firstDigit = 0;
  }

  if (firstDigit !== Number(cpf[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }

  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) {
    secondDigit = 0;
  }

  return secondDigit === Number(cpf[10]);
}

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
    if (!isValidCpf(req.body?.cpf)) {
      return res.status(400).json({ message: 'CPF invalido' });
    }

    const newClient = await model.createClient(req.body);
    res.status(201).json(newClient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateClient = async (req, res) => {
  try {
    if (!isValidCpf(req.body?.cpf)) {
      return res.status(400).json({ message: 'CPF invalido' });
    }

    const updated = await model.updateClient(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.json({ message: 'Cliente atualizado com sucesso', updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const patchClient = async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'cpf') && !isValidCpf(req.body?.cpf)) {
      return res.status(400).json({ message: 'CPF invalido' });
    }

    const patched = await model.patchClient(req.params.id, req.body);
    if (!patched) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.json({ message: 'Cliente atualizado com sucesso', patched });
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
    res.json({ message: 'Cliente removido com sucesso', deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClientByEmail = async (req, res) => {
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
};

const getClientByPhone = async (req, res) => {
  try {
    const { telefone } = req.query;
    if (!telefone) {
      return res.status(400).json({ message: 'Telefone obrigatório' });
    }

    const clients = await model.getClientByPhone(telefone);
    if (!clients || clients.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getClientsByName = async (req, res) => {
  try {
    const { nome } = req.query;

    if (!nome) {
      return res.status(400).json({ message: 'Nome obrigatório' });
    }

    const clients = await model.getClientsByName(nome);

    if (!clients || clients.length === 0) {
      return res.status(404).json({ message: 'Nenhum cliente encontrado' });
    }

    return res.status(200).json(clients);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
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

