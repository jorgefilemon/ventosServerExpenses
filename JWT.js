const { sign } = require("jsonwebtoken");

// createTokens gonna have all the info about my session which is user and name.
const createTokens = (user) => {
  const accessToken = sign(
    // payload
    {
      usu_id: user.usu_id,
      nombre: user.nombre,
    },
    // secret
    "382u397429&$"
  );

  return accessToken;
};

module.exports = { createTokens };
