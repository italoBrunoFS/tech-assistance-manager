const model = require('../models/employeesModel');
const { normalizeAccessLevel } = require('../utils/auth');

function isAdminRequest(req) {
  const accessLevel = normalizeAccessLevel(req.auth?.nivel_acesso);
  return Number.isInteger(accessLevel) && accessLevel >= 3;
}

const getAllEmployees = async (req, res) => {
  try {
    const employees = await model.getAllEmployees();
    res.status(200).json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employee = await model.getEmployeeById(req.params.id);

    if (!employee)
      return res.status(404).json({ message: 'Funcionário não encontrado' });

    res.status(200).json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (!isAdminRequest(req)) {
      payload.nivel_acesso = 1;
    }

    const employee = await model.createEmployee(payload);
    res.status(201).json(employee);
  } catch (err) {
    if (err.message.includes('nivel_acesso invalido')) {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (!isAdminRequest(req)) {
      const currentEmployee = await model.getEmployeeById(req.params.id);

      if (!currentEmployee) {
        return res.status(404).json({ message: 'Funcionario nao encontrado' });
      }

      payload.nivel_acesso = currentEmployee.nivel_acesso;
    }

    const updated = await model.updateEmployee(req.params.id, payload);

    if (!updated)
      return res.status(404).json({ message: 'Funcionário não encontrado' });

    res.json({ message: 'Funcionário atualizado com sucesso' });
  } catch (err) {
    if (err.message.includes('nivel_acesso invalido')) {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};

const patchEmployee = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (!isAdminRequest(req)) {
      delete payload.nivel_acesso;
    }

    const patched = await model.patchEmployee(req.params.id, payload);

    if (patched === false) {
      return res.status(400).json({ message: 'Nenhum campo permitido para atualizacao' });
    }

    if (!patched)
      return res.status(404).json({ message: 'Funcionário não encontrado' });

    res.json({ message: 'Funcionário atualizado' });
  } catch (err) {
    if (err.message.includes('nivel_acesso invalido')) {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};

const updateEmployeeAccessLevel = async (req, res) => {
  try {
    const targetId = Number(req.params.id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'ID de funcionario invalido' });
    }

    if (Number(req.auth?.sub) === targetId) {
      return res.status(400).json({ message: 'Nao e permitido alterar o proprio nivel por esta rota' });
    }

    const normalizedAccessLevel = normalizeAccessLevel(req.body?.nivel_acesso);

    if (!Number.isInteger(normalizedAccessLevel) || normalizedAccessLevel < 1) {
      return res.status(400).json({ message: 'nivel_acesso invalido. Use um numero inteiro maior ou igual a 1' });
    }

    const updatedEmployee = await model.updateEmployeeAccessLevel(targetId, normalizedAccessLevel);

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Funcionario nao encontrado' });
    }

    return res.status(200).json({
      message: 'Nivel de acesso atualizado com sucesso',
      data: updatedEmployee
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const deleted = await model.deleteEmployee(req.params.id);

    if (!deleted)
      return res.status(404).json({ message: 'Funcionário não encontrado' });

    res.json({ message: 'Funcionário removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  patchEmployee,
  updateEmployeeAccessLevel,
  deleteEmployee
};
