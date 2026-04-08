const model = require('../models/employeesModel');
const { createAuthToken, hashPassword, normalizeAccessLevel, verifyPassword } = require('../utils/auth');

async function login(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const employee = await model.getEmployeeAuthByEmail(email);

    if (!employee) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const passwordCheck = await verifyPassword(password, employee.senha_hash);

    if (!passwordCheck.matched) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (passwordCheck.needsUpgrade) {
      const upgradedHash = await hashPassword(password);
      await model.updateEmployeePasswordHash(employee.id_funcionario, upgradedHash);
    }

    return res.status(200).json({
      token: createAuthToken(employee),
      user: {
        id_funcionario: employee.id_funcionario,
        nome: employee.nome,
        email: employee.email,
        nivel_acesso: normalizeAccessLevel(employee.nivel_acesso),
        id_cargo: employee.id_cargo
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getCurrentUser(req, res) {
  try {
    const employee = await model.getEmployeeById(req.auth.sub);

    if (!employee) {
      return res.status(404).json({ message: 'Usuário autenticado não encontrado' });
    }

    return res.status(200).json(employee);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function bootstrapAdmin(req, res) {
  try {
    const employeeCount = await model.countEmployees();

    if (employeeCount > 0) {
      return res.status(403).json({ message: 'Bootstrap disponível apenas sem usuários cadastrados' });
    }

    const employee = await model.createEmployee({
      nome: req.body?.nome,
      email: req.body?.email,
      senha: req.body?.password,
      nivel_acesso: 3,
      id_cargo: req.body?.id_cargo || null
    });

    return res.status(201).json({
      message: 'Administrador inicial criado com sucesso',
      user: employee
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  bootstrapAdmin,
  getCurrentUser,
  login
};
