const express = require("express");
const router = express.Router();
const db = require("../database");
const moment = require("moment");

router.post("/", async (req, res) => {
	const { expenseList, usu_id } = req.body;

	console.log("this is expenseList", expenseList);
	console.log("user", usu_id);

	const formattedDate = moment().format("YYYY-MM-DD HH:mm:ss");

	console.log(formattedDate); // Outputs: YYYY-MM-DD HH:mm:ss

	const newArray = expenseList.map((expense) => [
		formattedDate,
		expense.type,
		expense.expenseName,
		expense.cantidad,
		usu_id,
	]);

	const conn = await db.getConnection();

	await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
	await conn.beginTransaction();

	try {
		const insertExpense = `
      INSERT INTO expense (date, type, name, expenseAmount, usu_id) VALUES ?;
    `;

		await conn.query(insertExpense, [newArray]);

		await conn.commit();
		res.status(200).send("Expenses added successfully");
	} catch (error) {
		await conn.rollback();
		console.error("Error inserting expenses:", error);
		res.status(500).send("Error inserting expenses");
	} finally {
		conn.release();
	}
});

module.exports = router;
