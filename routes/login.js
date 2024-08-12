const express = require("express");
const router = express.Router();
const db = require("../database");
//const mysql = require("mysql2/promise");
const { createTokens } = require("../JWT");
const md5 = require("md5");

// login authenticate
router.post("/", async (req, res) => {
	console.log("hitted");
	const { userName, password } = req.body;
	const passwordMd5 = md5(password);

	const conn = await db.getConnection();

	try {
		const [result] = await conn.query(
			`select * from sicar.usuario 
        where 
        usuario = ? and
        password = ? `,
			[userName, passwordMd5]
		);

		if (result.length > 0) {
			const myResult = result[0];

			// CREATE TOKEN
			const token = createTokens(myResult);

			// create cookie
			// cookie name , token that we storing in cookie
			res.cookie("access_token", token, {
				httpOnly: true,
				maxAge: 86400000,
				// secure: true ?????
			});
			res.send({ cookie: "cookie created", logged: true });
		} else {
			res.send({ message: "Usuario o contraseña incorrectos" });
		}
	} catch (error) {
		console.error(error);
	}
});

module.exports = router;
