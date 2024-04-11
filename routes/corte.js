const express = require("express");
const router = express.Router();
const db = require("../database");
const corteTicket = require("../corteTicket");

router.post("/", async (req, res) => {
  const { usu_id } = req.body;

  console.log("user", usu_id);
  const conn = await db.getConnection();

  await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
  await conn.beginTransaction();

  try {



    
    //////////////// TOTAL CASH//////////////////
    const [cash] = await conn.query(
      `SELECT SUM(CASE WHEN (movimiento.tipo = 1) THEN movimiento.total ELSE (0 - total) END) as cash 
      FROM movimiento WHERE (((cor_id IS NULL) AND (movimiento.caj_id = 1)) AND (tpa_id = 1))`
    );


    let cashTotal = 0;
    if (cash[0].cash != null) 
    cashTotal = parseFloat(cash[0].cash);
    console.log("cashTotal is:", cashTotal);


    /////////////// TOTAL card //////////
    const [card] = await conn.query(
      `SELECT SUM(CASE  WHEN (tipo = 1) THEN total ELSE (0 - total) END)as card FROM movimiento WHERE (((cor_id IS NULL) AND (caj_id = 1)) AND (tpa_id = 6))`
    );
    let cardTotal = 0;
    if (card[0].card != null) cardTotal = parseFloat(card[0].card);
    console.log("cardTotal is:", cardTotal);

    // date value
    const [currentTimeStamp] = await conn.query(`SELECT CURRENT_TIMESTAMP`);

    const time = currentTimeStamp[0].CURRENT_TIMESTAMP;

    console.log("la hora es", time);

    const sumCashCard = cashTotal + cardTotal;

    console.log("cash + card total", sumCashCard);

    //////////////////////  EFECTIVO + TARJETA ////////////////////
    const [cashAndCard] = await conn.query(
      `SELECT 
          ifnull(SUM(total), 0) 
          as total 
        FROM 
          movimiento 
          WHERE  tipo=1 
          and cor_id IS NULL 
          AND (caj_id = 1)  
          AND (tpa_id = 1 or tpa_id = 6 );`
    );

    const sumaTotal = cashAndCard[0].total;

    console.log("la suma de efectivo con tarjeta es:", sumaTotal);

    ///////////////// SUMA DE DINERO SACADO DE LA CAJA ////////////////

    const [efectivoSacado] = await conn.query(
      `SELECT 
          ifnull(SUM(total), 0) 
          as total 
        FROM 
          movimiento 
          WHERE  tipo=2 
          and cor_id IS NULL 
          AND (caj_id = 1)  
          AND (tpa_id = 1);`
    );

    const efectivoSacadoValor = efectivoSacado[0].total;

    const corteTotal = sumaTotal - efectivoSacadoValor;


 /// DEVOLUCION DE EFECTIVO 

 const [cambio] = await conn.query(`
    
 select ifnull(sum(detallev.importecon), 0) as cambio
 from venta
 left join detallev
 on venta.ven_id = detallev.ven_id
 where
 venta.rcc_id is null
 and detallev.descripcion like "%devolucion%"
 and venta.status = 1
`)

let cambioCliente = 0;
if (cambio[0].cambio != null) cambioCliente = parseFloat(cambio[0].cambio);
console.log("cambio es:", cambioCliente);



















    ///////////////  1 INSERT - CORTECAJA ////////////////////////////////////////////////////

    await conn.query(
      `INSERT INTO corteCaja (
        calculado, contado, diferencia,
        fecha,     retiro,  caj_id
        )
        VALUES
        (?, 0.00, ?,
         ?, 0.00, 1)`,
      [corteTotal, corteTotal * -1, time]
    );

    const [last_id] = await conn.query("SELECT LAST_INSERT_ID();");
    const cor_id = Object.values(last_id[0]);
    console.log(`1) cortecaja con cor_id`, cor_id, "total de", corteTotal);

    /////////// 2 INSERT -HISTORIAL  ///////////////////////////////////////////////
    await conn.query(
      `INSERT INTO
          historial (
            fecha, id,    movimiento,
            tabla, usu_id
        )
          VALUES (
            ?, ?, 0,
            'CorteCaja', ?)`,
      [time, cor_id, usu_id]
    );

    /////////////////////// 3 UPDATE - MOVIMIENTO /////////////////////////

    await conn.query(
      `UPDATE movimiento SET cor_id = ? WHERE ((cor_id IS NULL) AND (caj_id = 1))`,
      [cor_id]
    );

    ////////////////////// 4 INSERT - RESUMEN CORTE CAJA ///////////////////////////

    await conn.query(
      `INSERT INTO resumenCorteCaja (comCon, comConC, comCre, comCreC, entComC, entCre, entMov, entNotC, entVen, notCre, notCreC, salCom, salCre, salMov, salNot, salVenC, venCon, venConC, venCre, venCreC, cor_id) VALUES (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?)`,
      [cor_id]
    );

    const [resumenCorteCajaId] = await conn.query(`SELECT LAST_INSERT_ID()`);
    const rcc_id = Object.values(resumenCorteCajaId[0]);

    console.log("4) resumencortecaja rcc_id", rcc_id);

    ///////////////////// 5 INSERT - HISTORIAL ///////////////////////////////////////

    await conn.query(
      `INSERT INTO historial (
        fecha, id, movimiento,
        tabla,              usu_id)
         VALUES (
          ?,    ?,     0,
        'ResumenCorteCaja',   ?
        )`,
      [time, rcc_id, usu_id]
    );

    /////////////////////// 6 UPDATE - VENTA ////////////////////////
    await conn.query(
      `UPDATE venta SET rcc_id = ? WHERE ((caj_id = 1) AND (rcc_id IS NULL))`,
      [rcc_id]
    );
    console.log("6) update venta with rcc_id", rcc_id);

    /////////////////////// 7 UPDATE - VENTA - VENTA CANCELADA ////////////////////////

    await conn.query(
      `UPDATE venta SET can_rcc_id = ? WHERE ((can_caj_id = 1) AND (can_rcc_id IS NULL))`,
      [rcc_id]
    );

    ////////////////////// SUM - VENTA -- VENTAS FROM VENTA ///////////////////////////////////////

    const [venConRespuesta] = await conn.query(
      `SELECT ifnull(SUM(total), 0) FROM venta WHERE (rcc_id = ?) LIMIT 0, 1`,
      [rcc_id]
    );
    const venCon = Object.values(venConRespuesta[0]);
    console.log("venCon from venta =", venCon);

    //////////////////// 8 UPDATE - RESUMEN CORTE CAJA //////////////////////////
    await conn.query(
      `UPDATE resumenCorteCaja SET venCon = ?, entVen = ? WHERE (rcc_id = ?)`,
      [venCon, venCon, rcc_id]
    );
    console.log("8) resumenCorteCaja venCon", venCon, "en rcc_id", rcc_id);

    ////////////////// 10 SUM - SELECT SUM VENTA CANCELADA FROM VENTA /////////////////////
    const [venConCres] = await conn.query(
      "SELECT ifnull(SUM(total), 0) FROM venta WHERE (can_rcc_id = ?) LIMIT 0, 1;",
      [rcc_id]
    );
    const venConC = Object.values(venConCres[0]);
    console.log("10) venConC(venta con cancelacion) from venta =", venConC);

    ///////////////// 11 UPDATE RESUMEN CORTE CAJA VENTA CANCELADAS ///////////////
    await conn.query(
      `UPDATE resumenCorteCaja SET venConC = ?, salVenC = ? WHERE (rcc_id = ?)`,
      [venConC, venConC, rcc_id]
    );

    ///////////////// 12 SUM - SELECT SUM SALIDA DE EFECTIVO FROM MOVIMIENTO /////////

    const [sumSalidaDeEfectivo] = await conn.query(
      `SELECT ifnull(SUM(total), 0) FROM movimiento WHERE cor_id = ? AND ven_id is NULL and tipo = 2 LIMIT 0, 1`,
      [cor_id]
    );
    const salMov = Object.values(sumSalidaDeEfectivo[0]);
    console.log("salMov from movimiento =", salMov);

    //////////////// 13 UPDATE - RESUMEN CORTE CAJA - SUMA DE  SALIDA DE EFECTIVO //////

    await conn.query(
      `UPDATE resumenCorteCaja SET salMov = ? WHERE (rcc_id = ?)`,
      [salMov, rcc_id]
    );

    /////////////////// SELECT SUM FROM VENTA CANCELADA EN EFECTIVO ////////////////////
    const [sumVentaCanceladaEfectivo] = await conn.query(
      `SELECT ifnull(SUM(total),0) FROM movimiento WHERE cor_id = ? AND tipo = 2 AND tpa_id = 1 LIMIT 0, 1`,
      [cor_id]
    );

    const ventaCanceladaEfectivo = Object.values(sumVentaCanceladaEfectivo[0]);

    //////////////// 14 INSERT - RESUMEN TIPO PAGO - EFECTIVO ///////
    await conn.query(
      `INSERT INTO resumenTipoPago (
        entComC, entCre, entMov, 
        entNotC, entVen, salCom, 
        salCre,  salMov, salNot, 
        salVenC, tpa_id, rcc_id
        ) VALUES (
          0, 0, 0, 
          0, ?, 0, 
          0, ?, 0, 
          ?, 1, ?
          )`,
      [cashTotal, salMov, ventaCanceladaEfectivo, rcc_id]
    );

    console.log(
      "resumen tipo pago en efectivo cashTotal, salMov, venta Cancelada efectivo, rcc_id",
      cashTotal,
      salMov,
      ventaCanceladaEfectivo
    );

    //// SELECT SUM VENTA CANCELADA EN TARJETA - MOVIMIENTO //////////////////////////////

    const [sumVentaCanceladaTarjeta] = await conn.query(
      `SELECT ifnull(SUM(total),0) FROM movimiento WHERE cor_id = ? AND tipo = 2 AND tpa_id = 6 LIMIT 0, 1`,
      [cor_id]
    );

    const ventaCanceladaTarjeta = Object.values(sumVentaCanceladaTarjeta[0]);

    //////////////// 15 INSERT - RESUMEN TIPO PAGO - TARJETA ///////

    await conn.query(
      `INSERT INTO resumenTipoPago (
    entComC, entCre, entMov, 
    entNotC, entVen, salCom, 
    salCre,  salMov, salNot, 
    salVenC, tpa_id, rcc_id
    ) 
    VALUES (
      0, 0, 0, 
      0, ?, 0, 
      0, 0, 0, 
      ?, 6, ?)`,
      [cardTotal, ventaCanceladaTarjeta, rcc_id]
    );

    console.log(
      "15) resumen tipo pago ventas canceladas tarjeta",
      cardTotal,
      ventaCanceladaTarjeta
    );

    //////////////// 16 INSERT - CORTE TIPO PAGO EFECTIVO///////////////

    const calculadoEfectivo = cashTotal - salMov - ventaCanceladaEfectivo;

    await conn.query(
      `INSERT INTO corteTipoPago (
      calculado, contado, diferencia, 
      retiro,    cor_id,  tpa_id) 
      VALUES 
      (?, 0.00, ?,
       0.00,    ?,  1
       )`,
      [calculadoEfectivo, calculadoEfectivo * -1, cor_id]
    );

    //////////////// 16 INSERT - CORTE TIPO PAGO TARJETA///////////////

    const calculadoTarjeta = cardTotal - ventaCanceladaTarjeta;

    await conn.query(
      `INSERT INTO corteTipoPago (
      calculado, contado, diferencia, 
      retiro,    cor_id,  tpa_id) 
      VALUES 
      (
       ?,    0.00, ?,
       0.00, ?,    6
      )`,
      [calculadoTarjeta, calculadoTarjeta * -1, cor_id]
    );

    /// nombre de usuario. 
    const [nombre]= await conn.query(
      `select nombre from usuario where usu_id =? `, [usu_id]
    )


    const nombreUsuario = Object.values(nombre[0]);

    ///  UPDATE CAJA SET IT TO 0 //////////////////////////

    await conn.query(`UPDATE caja SET total = 0 WHERE (1 = caj_id)`);


   
    /// COMMIT QUERIES ////////////////



    await conn.commit();

    console.log('time from corte.js', time)
    corteTicket(cashTotal, cardTotal, sumaTotal, nombreUsuario, time, cambioCliente);




    console.log(" cash desk closing has been successful");
    res.json({ 
      cash: cashTotal, 
      card: cardTotal, 
      suma: sumaTotal,
      cambioCliente: cambioCliente});

    conn.release();
  } catch (err) {
    conn.rollback();
    conn.release();
    console.log("rollback applied");
    console.error(err);
  }
});

module.exports = router;
