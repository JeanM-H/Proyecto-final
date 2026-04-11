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

const generateToken = (payload) => jwt.sign(payload, secret, { expiresIn: '1h' });

module.exports = { verifyToken, generateToken };