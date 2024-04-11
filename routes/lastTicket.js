const express = require("express");
const router = express.Router();
const db = require("../database");
const ultimoTicket = require("../lastTicket");

// print las ticket
router.get("/", async (req, res) => {
  const conn = await db.getConnection();

  await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
  await conn.beginTransaction();

  try {
    const [invoice] = await conn.query(
      `select 
       ven_id,
       tic_id,    fecha, subtotal, 
       descuento, total, cambio 
       from 
       venta 
       order by tic_id desc limit 1;`
    );

    console.log("invoice from lastTicket", invoice)

    const ven_id = invoice[0].ven_id;

    const [detallev] = await conn.query(
      `select 
      descripcion, precioNorCon,    precioCon,   
      cantidad,    descPorcentaje , importeNorCon, importeCon
      from 
      detallev where ven_id = ?`,
      [ven_id]
    );

    const [mov] = await conn.query(
      `select 
      tpa_id, ven_id, total 
      from 
      movimiento 
      where ven_id = ?`,
      [ven_id]
    );

    await conn.commit();

    
    ultimoTicket(invoice, detallev, mov);

    console.log("last ticket sent", invoice[0].tic_id);

    res.json({ venta: invoice, detallev: detallev, movimiento: mov });
  } catch (err) {
    conn.rollback();
    console.log("rollback applied");
    console.error(err);
  }
});

module.exports = router;
