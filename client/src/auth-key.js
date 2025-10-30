// src/auth-key.js
module.exports = function requireKey(req, res, next) {
  const expected = process.env.INTERNAL_API_KEY;
  const got = req.headers['x-api-key'];
  if (!expected || got !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
};
