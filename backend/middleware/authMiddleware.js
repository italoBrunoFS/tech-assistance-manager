const { normalizeAccessLevel, verifyAuthToken } = require('../utils/auth');

function authenticate(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization || '';

    if (!authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Autenticação obrigatória' });
    }

    const token = authorizationHeader.slice(7).trim();
    const payload = verifyAuthToken(token);

    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

function authorizeRoles(...allowedRoles) {
  const normalizedRoles = allowedRoles
    .map(normalizeAccessLevel)
    .filter((level) => Number.isInteger(level));

  const minimumRequiredLevel = normalizedRoles.length > 0
    ? Math.min(...normalizedRoles)
    : 1;

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: 'Autenticação obrigatória' });
    }

    const userRole = normalizeAccessLevel(req.auth.nivel_acesso);

    if (!Number.isInteger(userRole) || userRole < minimumRequiredLevel) {
      return res.status(403).json({ message: 'Acesso negado para este perfil' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles
};
