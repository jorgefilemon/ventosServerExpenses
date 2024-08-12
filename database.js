const mysql = require("mysql2/promise");

const db = mysql.createPool({
	// connectionLimit: 10,
	user: process.env.USER_NAME,
	host: process.env.HOST,
	password: process.env.PASSWORD,
	connectTimeout: 30000,
	database: process.env.DATABASE,
	port: process.env.PORT,
	multipleStatements: false,
	timezone: "Z", // optional, i had it on, but change queries so i can have it off.
});

module.exports = db;
