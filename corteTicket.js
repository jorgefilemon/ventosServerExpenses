// const printer = require("@thiagoelg/node-printer");
const thermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;
const moment = require("moment");

function realizarCorte(
	cashTotal,
	cardTotal,
	sumaTotal,
	nombre,
	fecha,
	cambioCliente
) {
	//
	const onlyDate = moment(fecha).locale("es").format("/DD/YYYY");
	const month = moment(fecha).locale("es").format("MMM");
	const mesSinPunto = month.replace(".", "").toUpperCase();
	const onlyTime = moment(fecha).utc().format("h:mm:ss A");

	console.log("only time", onlyTime);
	console.log(cambioCliente, "cambio ticket");

	const print = new thermalPrinter({
		type: Types.EPSON,
		width: 38,
	});

	print.alignCenter();
	print.println("-------- CORTE CAJA --------");

	print.newLine();
	print.alignLeft();

	print.println(`USUARIO:${nombre}`);
	print.println("CAJA:   Caja 1");
	print.println(`FECHA:  ${mesSinPunto}${onlyDate}`);
	print.println(`HORA:   ${onlyTime}`);
	print.alignCenter();
	print.newLine();

	print.drawLine();

	print.newLine();

	print.println("<<<<<<<<< FORMAS DE PAGO >>>>>>>>>");
	print.newLine();
	print.tableCustom([
		{ text: "EFECTIVO:", align: "RIGHT", width: 0.4, cols: 1 },
		{
			text: parseInt(cashTotal).toFixed(2),
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
	]);
	print.tableCustom([
		{ text: "TARJETA:", align: "RIGHT", width: 0.4, cols: 1 },
		{
			text: parseInt(cardTotal).toFixed(2),
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
	]);
	print.drawLine();
	print.tableCustom([
		{ text: "TOTAL:", align: "RIGHT", width: 0.4, cols: 1 },
		{ text: sumaTotal, align: "RIGHT", width: 0.4, cols: 1 },
	]);

	print.drawLine();
	print.tableCustom([
		{
			text: "DEVOLUCION DE EFECTIVO:",
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
		{
			text: parseInt(cambioCliente).toFixed(2),
			align: "RIGHT",
			width: 0.4,
			cols: 1,
		},
	]);
	print.newLine();

	print.cut();
	print.openCashDrawer();

	const data = print.getBuffer();

	printer.printDirect({
		data: data,
		type: "RAW",
		printer: "epson tm-t81 Receipt",
		success: function (jobID) {
			console.log("sent to printer with ID: " + jobID);
		},
		error: function (err) {
			console.log(err);
		},
	});
}

module.exports = realizarCorte;
