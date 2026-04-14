const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'default_secret';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

const verifyTokenString = (token) => {
  if (!token) {
    throw new Error('Token no proporcionado');
  }
  return jwt.verify(token, secret);
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado: rol insuficiente' });
    }
    next();
  };
};

const generateToken = (payload) => jwt.sign(payload, secret, { expiresIn: '24h' });

module.exports = { verifyToken, verifyTokenString, requireRole, generateToken };