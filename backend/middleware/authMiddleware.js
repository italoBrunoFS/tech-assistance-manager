const { normalizeAccessLevel, verifyAuthToken } = require('../utils/auth');

function authenticate(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization || '';

    if (!authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Autenticacao obrigatoria' });
    }

    const token = authorizationHeader.slice(7).trim();
    const payload = verifyAuthToken(token);

    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalido ou expirado' });
  }
}

function authorizeRoles(...allowedRoles) {
  const normalizedRoles = allowedRoles.map(normalizeAccessLevel);

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: 'Autenticacao obrigatoria' });
    }

    const userRole = normalizeAccessLevel(req.auth.nivel_acesso);

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Acesso negado para este perfil' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles
};
