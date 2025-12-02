// backend/src/middlewares/authAdmin.js
const jwt = require('jsonwebtoken');

function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'segredo_super_simples';
    const payload = jwt.verify(token, secret);

    // podemos guardar infos do admin aqui se quiser
    req.admin = payload;
    next();
  } catch (err) {
    console.error('Erro no authAdmin:', err);
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = authAdmin;
