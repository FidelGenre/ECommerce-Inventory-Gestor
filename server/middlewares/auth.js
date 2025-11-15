// server/middlewares/auth.js
const jwt = require("jsonwebtoken");

/**
 * Extrae el token JWT desde las cookies o el header Authorization: Bearer
 */
function getTokenFromReq(req) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  return req.cookies?.token || bearer || null;
}

/**
 * Middleware para rutas protegidas.
 * Verifica el token JWT; si es válido, agrega req.user.
 * Si no existe o es inválido, responde con 401 Unauthorized.
 */
function authRequired(req, res, next) {
  const token = getTokenFromReq(req);

  if (!token) {
    console.warn("authRequired: sin token o cookie");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = payload; // { id, email, role, name }
    next();
  } catch (e) {
    console.warn("authRequired: token inválido →", e.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Middleware para restringir rutas según el rol del usuario
 * Ejemplo: router.post('/admin', roleRequired('admin'), handler)
 */
function roleRequired(role) {
  return (req, res, next) => {
    if (!req.user) {
      console.warn("roleRequired: sin sesión activa");
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role !== role) {
      console.warn(
        `roleRequired: acceso denegado. Se requiere rol '${role}', usuario actual: '${req.user.role}'`
      );
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = { authRequired, roleRequired };
