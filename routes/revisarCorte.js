const express = require("express");
const router = express.Router();
const db = require("../database");



router.get("/", async (req, res) => {


  const conn = await db.getConnection();

  await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
  await conn.beginTransaction();

  try {
    //////////////// TOTAL CASH//////////////////
    const [cash] = await conn.query(
      `SELECT SUM(
        CASE WHEN movimiento.tipo = 1 THEN movimiento.total ELSE - movimiento.total END
    ) AS cash 
    FROM movimiento 
    WHERE cor_id IS NULL AND movimiento.caj_id = 1 AND tpa_id = 1;`
    );
    let cashTotal = 0;
    if (cash[0].cash != null) cashTotal = parseFloat(cash[0].cash);
    console.log("cashTotal is:", cashTotal);

    /////////////// TOTAL DEBIT //////////
    const [card] = await conn.query(
      `SELECT SUM(
        CASE WHEN movimiento.tipo = 1 THEN movimiento.total ELSE - movimiento.total END
    ) AS card 
    FROM movimiento 
    WHERE cor_id IS NULL AND movimiento.caj_id = 1 AND tpa_id = 6;`
    );
    let cardTotal = 0;
    if (card[0].card != null) cardTotal = parseFloat(card[0].card);
    console.log("cardTotal is:", cardTotal);

    // date value

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
    // console.log(cambio, "cambio")
    let cambioCliente = 0;
    if (cambio[0].cambio != null) cambioCliente = parseFloat(cambio[0].cambio);
    console.log("cambio es is:", cambioCliente);

    // console.log(cambioCliente)
    await conn.commit();

    console.log(" cash desk closing sent");
    res.json({ 
      cash: cashTotal, 
      card: cardTotal, 
      total: sumCashCard,
      cambioCliente: cambioCliente });
    conn.release();
  } catch (err) {
    conn.rollback();
    console.log("rollback applied");
    console.error(err);
  }
});

module.exports = router;
