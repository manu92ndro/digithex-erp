const db = require("../config/db");
const { registrarLog } = require("../helpers/logs");

const esSuperAdmin = (usuario) =>
  usuario?.rol === "SUPER ADMIN" || usuario?.rol_nombre === "SUPER ADMIN";

const getIdEmpresa = (req) => {
  if (esSuperAdmin(req.usuario)) {
    return req.body.id_empresa || req.query.id_empresa || req.usuario.id_empresa;
  }

  return req.usuario.id_empresa;
};

const getRentasFormData = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    const [clientes] = await db.query(
      `
      SELECT id_cliente, nombres, celular, correo, direccion
      FROM tb_clientes
      WHERE id_empresa = ? AND estado = 1
      ORDER BY nombres ASC
      `,
      [id_empresa]
    );

    const [dumpsters] = await db.query(
      `
      SELECT 
        id_dumpster,
        codigo,
        tamano_yardas,
        capacidad_toneladas,
        precio_base,
        max_dias,
        precio_extra_tonelada,
        precio_extra_yarda,
        precio_extra_dia,
        estado
      FROM dumpsters
      WHERE id_empresa = ? AND estado = 'disponible'
      ORDER BY tamano_yardas ASC, codigo ASC
      `,
      [id_empresa]
    );

    const [camiones] = await db.query(
      `
      SELECT id_camion, nombre_camion, placa, peso_min, peso_max
      FROM tb_camion
      WHERE id_empresa = ? AND estado = 1
      ORDER BY nombre_camion ASC
      `,
      [id_empresa]
    );

    const [materiales] = await db.query(
      `
      SELECT id_material, nombre_material
      FROM tb_material
      ORDER BY nombre_material ASC
      `
    );

    const [ubicaciones] = await db.query(
      `
      SELECT id_ubicacion, ubicacion
      FROM tb_ubicacion_caja
      ORDER BY ubicacion ASC
      `
    );

    const [taxRows] = await db.query(
      `
      SELECT id_tax, nombre, tax_rate
      FROM tb_impuestos
      WHERE id_empresa = ? AND activo = 1
      ORDER BY id_tax DESC
      LIMIT 1
      `,
      [id_empresa]
    );

    res.json({
      ok: true,
      clientes,
      dumpsters,
      camiones,
      materiales,
      ubicaciones,
      impuesto: taxRows[0] || null,
    });
  } catch (error) {
    console.error("Error al cargar datos de renta:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al cargar datos del formulario de renta",
    });
  }
};

const listarRentas = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    const [rentas] = await db.query(
      `
      SELECT 
        r.id_renta,
        r.fecha_inicio,
        r.dias_renta,
        r.fecha_estimada_devolucion,
        r.fecha_real_devolucion,
        r.direccion_entrega,
        r.estado,
        r.observaciones,
        r.fecha_registro,

        c.nombres AS cliente,
        c.celular,
        c.correo,

        d.codigo AS dumpster_codigo,
        d.tamano_yardas,
        d.capacidad_toneladas,

        ca.nombre_camion,
        ca.placa,

        m.nombre_material,
        u.ubicacion,

        f.subtotal_base,
        f.tax_amount,
        f.total_extras,
        f.total_final,
        f.saldo_pendiente
      FROM tb_rentas r
      INNER JOIN tb_clientes c ON c.id_cliente = r.id_cliente
      INNER JOIN dumpsters d ON d.id_dumpster = r.id_dumpster
      INNER JOIN tb_camion ca ON ca.id_camion = r.id_camion
      INNER JOIN tb_material m ON m.id_material = r.id_material
      INNER JOIN tb_ubicacion_caja u ON u.id_ubicacion = r.id_ubicacion
      LEFT JOIN tb_renta_finanzas f ON f.id_renta = r.id_renta
      WHERE r.id_empresa = ?
      ORDER BY r.id_renta DESC
      `,
      [id_empresa]
    );

    res.json({ ok: true, rentas });
  } catch (error) {
    console.error("Error al listar rentas:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al listar rentas",
    });
  }
};

const crearRenta = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const id_empresa = getIdEmpresa(req);
    const creado_por = req.usuario.id_usuario;

    const {
      id_cliente,
      id_dumpster,
      id_camion,
      id_material,
      id_ubicacion,
      fecha_inicio,
      dias_renta,
      fecha_estimada_devolucion,
      direccion_entrega,
      latitud,
      longitud,
      observaciones,
      precio_base,
      aplica_tax_base,
      estado_pago,
      monto_abonado,
      tipo_pago,
    } = req.body;

    if (
      !id_cliente ||
      !id_dumpster ||
      !id_camion ||
      !id_material ||
      !id_ubicacion ||
      !fecha_inicio ||
      !dias_renta ||
      !fecha_estimada_devolucion ||
      !precio_base ||
      !estado_pago
    ) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Faltan datos obligatorios para crear la renta",
      });
    }

    const [dumpsterRows] = await conn.query(
      `
      SELECT *
      FROM dumpsters
      WHERE id_dumpster = ?
        AND id_empresa = ?
        AND estado = 'disponible'
      LIMIT 1
      FOR UPDATE
      `,
      [id_dumpster, id_empresa]
    );

    if (dumpsterRows.length === 0) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        msg: "El dumpster no está disponible",
      });
    }

    const [taxRows] = await conn.query(
      `
      SELECT id_tax, nombre, tax_rate
      FROM tb_impuestos
      WHERE id_empresa = ?
        AND activo = 1
      ORDER BY id_tax DESC
      LIMIT 1
      `,
      [id_empresa]
    );

    const taxRate = Number(taxRows[0]?.tax_rate || 0);

    const subtotal_base = Number(precio_base);
    const montoBasePagado =
      estado_pago === "paid"
        ? subtotal_base
        : estado_pago === "partial"
        ? Number(monto_abonado || 0)
        : 0;

    const tax = aplica_tax_base ? montoBasePagado * taxRate : 0;
    const abonado = montoBasePagado + tax;
    const total = subtotal_base + tax;


    if (abonado > total) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "El monto abonado no puede ser mayor al total",
      });
    }

    const saldo_pendiente = Math.max(total - abonado, 0);

    const [rentaResult] = await conn.query(
      `
      INSERT INTO tb_rentas (
        id_empresa,
        id_dumpster,
        id_cliente,
        id_camion,
        id_material,
        id_ubicacion,
        fecha_inicio,
        dias_renta,
        fecha_estimada_devolucion,
        direccion_entrega,
        latitud,
        longitud,
        estado,
        observaciones,
        creado_por,
        fecha_registro
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'programada', ?, ?, NOW())
      `,
      [
        id_empresa,
        id_dumpster,
        id_cliente,
        id_camion,
        id_material,
        id_ubicacion,
        fecha_inicio,
        dias_renta,
        fecha_estimada_devolucion,
        direccion_entrega || null,
        latitud || null,
        longitud || null,
        observaciones || null,
        creado_por,
      ]
    );

    const id_renta = rentaResult.insertId;

    await conn.query(
      `
      INSERT INTO tb_renta_finanzas (
        id_empresa,
        id_renta,
        subtotal_base,
        total_estimado,
        aplica_tax_base,
        tax_rate,
        total_extras,
        tax_amount,
        total_final,
        saldo_pendiente
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `,
      [
        id_empresa,
        id_renta,
        subtotal_base,
        subtotal_base,
        aplica_tax_base ? 1 : 0,
        taxRate,
        tax,
        total,
        saldo_pendiente,
      ]
    );

    if (estado_pago !== "pending" && abonado > 0) {
      await conn.query(
        `
        INSERT INTO tb_renta_pagos (
          id_empresa,
          id_renta,
          id_cliente,
          monto_abonado,
          tipo_pago,
          estado_pago,
          observaciones,
          creado_por,
          fecha_pago
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          id_empresa,
          id_renta,
          id_cliente,
          abonado,
          tipo_pago || "cash",
          saldo_pendiente === 0 ? "paid" : "partial",
          "Pago registrado al crear renta",
          creado_por,
        ]
      );
    }

    await conn.query(
      `
      UPDATE dumpsters
      SET estado = 'rentado',
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_dumpster = ?
        AND id_empresa = ?
      `,
      [id_dumpster, id_empresa]
    );

    await conn.commit();

    await registrarLog({
      req,
      modulo: "Rentas",
      accion: "CREAR",
      descripcion: `Renta creada #${id_renta}`,
    });

    res.status(201).json({
      ok: true,
      msg: "Renta creada correctamente",
      id_renta,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error al crear renta:", error);

    res.status(500).json({
      ok: false,
      msg: "Error al crear renta",
    });
  } finally {
    conn.release();
  }
};

const obtenerRentaDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const id_empresa = getIdEmpresa(req);

    const [rentas] = await db.query(
      `
      SELECT 
        r.*,

        c.nombres AS cliente,
        c.celular,
        c.correo,
        c.direccion AS direccion_cliente,

        d.codigo AS dumpster_codigo,
        d.tamano_yardas,
        d.capacidad_toneladas,
        d.precio_base,

        ca.nombre_camion,
        ca.placa,

        m.nombre_material,
        u.ubicacion,

        f.subtotal_base,
        f.aplica_tax_base,
        COALESCE(i.tax_rate, f.tax_rate, 0) AS tax_rate,
        COALESCE(i.nombre, 'Tax') AS nombre_impuesto,
        f.total_extras,
        f.tax_amount,
        f.total_final,
        f.saldo_pendiente

      FROM tb_rentas r
      INNER JOIN tb_clientes c ON c.id_cliente = r.id_cliente
      INNER JOIN dumpsters d ON d.id_dumpster = r.id_dumpster
      INNER JOIN tb_camion ca ON ca.id_camion = r.id_camion
      INNER JOIN tb_material m ON m.id_material = r.id_material
      INNER JOIN tb_ubicacion_caja u ON u.id_ubicacion = r.id_ubicacion
      LEFT JOIN tb_renta_finanzas f ON f.id_renta = r.id_renta
      LEFT JOIN tb_impuestos i 
        ON i.id_empresa = r.id_empresa 
      AND i.activo = 1
      WHERE r.id_renta = ?
        AND r.id_empresa = ?
      LIMIT 1
      `,
      [id, id_empresa]
    );

    if (rentas.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Renta no encontrada",
      });
    }

    const [pagos] = await db.query(
      `
      SELECT *
      FROM tb_renta_pagos
      WHERE id_renta = ?
        AND id_empresa = ?
      ORDER BY id_pago DESC
      `,
      [id, id_empresa]
    );

    const [extras] = await db.query(
      `
      SELECT *
      FROM tb_renta_extras
      WHERE id_renta = ?
        AND id_empresa = ?
      ORDER BY id_extra DESC
      `,
      [id, id_empresa]
    );

    res.json({
      ok: true,
      renta: rentas[0],
      pagos,
      extras,
    });
  } catch (error) {
    console.error("Error al obtener detalle de renta:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener detalle de renta",
    });
  }
};

const agregarExtraRenta = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const id_empresa = getIdEmpresa(req);
    const creado_por = req.usuario.id_usuario;

    const {
      tipo_extra,
      descripcion,
      monto,
    } = req.body;

    const montoBase = Number(monto || 0);

    if (!tipo_extra) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Selecciona el tipo de extra",
      });
    }

    if (montoBase <= 0) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Ingresa un monto válido",
      });
    }

    const [rentaRows] = await conn.query(
      `
      SELECT id_renta, estado
      FROM tb_rentas
      WHERE id_renta = ?
        AND id_empresa = ?
      LIMIT 1
      FOR UPDATE
      `,
      [id, id_empresa]
    );

    if (rentaRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        msg: "Renta no encontrada",
      });
    }

    if (
      rentaRows[0].estado === "finalizado" ||
      rentaRows[0].estado === "cancelado"
    ) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "No se pueden agregar extras a una renta cerrada",
      });
    }

    const taxAmount = 0;
    const totalExtra = montoBase;

    await conn.query(
      `
      INSERT INTO tb_renta_extras (
        id_empresa,
        id_renta,
        tipo_extra,
        descripcion,
        monto,
        fecha_registro,
        creado_por,
        estado_pago
      )
      VALUES (?, ?, ?, ?, ?, NOW(), ?, 'pendiente')
      `,
      [
        id_empresa,
        id,
        tipo_extra,
        descripcion || null,
        montoBase,
        creado_por,
      ]
    );

    const [totalesRows] = await conn.query(
      `
      SELECT
        COALESCE(SUM(monto), 0) AS total_extras
      FROM tb_renta_extras
      WHERE id_empresa = ?
        AND id_renta = ?
        AND estado_pago <> 'anulado'
      `,
      [id_empresa, id]
    );

    const totalExtras = Number(totalesRows[0]?.total_extras || 0);

    const [pagosRows] = await conn.query(
      `
      SELECT COALESCE(SUM(monto_abonado), 0) AS total_pagado
      FROM tb_renta_pagos
      WHERE id_empresa = ?
        AND id_renta = ?
        AND estado_pago <> 'anulado'
      `,
      [id_empresa, id]
    );

    const totalPagado = Number(pagosRows[0]?.total_pagado || 0);

    const [finanzasRows] = await conn.query(
      `
      SELECT subtotal_base, tax_amount
      FROM tb_renta_finanzas
      WHERE id_empresa = ?
        AND id_renta = ?
      LIMIT 1
      FOR UPDATE
      `,
      [id_empresa, id]
    );

    if (finanzasRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        msg: "Finanzas de renta no encontradas",
      });
    }

    const subtotalBase = Number(finanzasRows[0].subtotal_base || 0);
    const taxAmountFinanzas = Number(finanzasRows[0].tax_amount || 0);

    const nuevoTotalFinal = Number(
      (subtotalBase + taxAmountFinanzas + totalExtras).toFixed(2)
    );

    const nuevoSaldoPendiente = Math.max(
      Number((nuevoTotalFinal - totalPagado).toFixed(2)),
      0
    );

    await conn.query(
      `
      UPDATE tb_renta_finanzas
      SET total_extras = ?,
          total_final = ?,
          saldo_pendiente = ?
      WHERE id_empresa = ?
        AND id_renta = ?
      `,
      [
        totalExtras,
        nuevoTotalFinal,
        nuevoSaldoPendiente,
        id_empresa,
        id,
      ]
    );

    await conn.commit();

    res.json({
      ok: true,
      msg: "Cargo extra agregado correctamente",
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error al agregar extra:", error);

    res.status(500).json({
      ok: false,
      msg: error.sqlMessage || "Error al agregar cargo extra",
    });
  } finally {
    conn.release();
  }
};

const finalizarRenta = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const id_empresa = getIdEmpresa(req);

    const [rentas] = await conn.query(
      `
      SELECT *
      FROM tb_rentas
      WHERE id_renta = ?
        AND id_empresa = ?
      LIMIT 1
      FOR UPDATE
      `,
      [id, id_empresa]
    );

    if (rentas.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        msg: "Renta no encontrada",
      });
    }

    if (["finalizado", "cancelado"].includes(rentas[0].estado)) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Esta renta ya no se puede finalizar",
      });
    }

    await conn.query(
      `
      UPDATE tb_rentas
      SET estado = 'finalizado',
          fecha_real_devolucion = CURDATE(),
          fyh_actualizacion = NOW()
      WHERE id_renta = ?
        AND id_empresa = ?
      `,
      [id, id_empresa]
    );

    await conn.query(
      `
      UPDATE dumpsters
      SET estado = 'disponible',
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_dumpster = ?
        AND id_empresa = ?
      `,
      [rentas[0].id_dumpster, id_empresa]
    );

    await conn.commit();

    await registrarLog({
      req,
      modulo: "Rentas",
      accion: "FINALIZAR",
      descripcion: `Renta finalizada #${id}`,
    });

    res.json({
      ok: true,
      msg: "Renta finalizada correctamente",
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error al finalizar renta:", error);

    res.status(500).json({
      ok: false,
      msg: "Error al finalizar renta",
    });
  } finally {
    conn.release();
  }
};

const cancelarRenta = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { motivo_cancelacion } = req.body;
    const id_empresa = getIdEmpresa(req);

    if (!motivo_cancelacion || !motivo_cancelacion.trim()) {
      return res.status(400).json({
        ok: false,
        msg: "Ingresa el motivo de cancelación",
      });
    }

    await connection.beginTransaction();

    const [rentas] = await connection.query(
      `
      SELECT id_renta, id_dumpster, estado
      FROM tb_rentas
      WHERE id_renta = ?
        AND id_empresa = ?
      LIMIT 1
      `,
      [id, id_empresa]
    );

    if (rentas.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        msg: "Renta no encontrada",
      });
    }

    if (rentas[0].estado === "finalizado" || rentas[0].estado === "cancelado") {
      await connection.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Esta renta ya está cerrada",
      });
    }

    await connection.query(
      `
      UPDATE tb_rentas
      SET estado = 'cancelado',
          observaciones = CONCAT(
            COALESCE(observaciones, ''),
            '\nCancelación: ',
            ?
          )
      WHERE id_renta = ?
        AND id_empresa = ?
      `,
      [motivo_cancelacion.trim(), id, id_empresa]
    );

    await connection.query(
      `
      UPDATE tb_renta_finanzas
      SET saldo_pendiente = 0
      WHERE id_renta = ?
        AND id_empresa = ?
      `,
      [id, id_empresa]
    );

    await connection.query(
      `
      UPDATE tb_renta_pagos
      SET estado_pago = 'anulado',
          observaciones = CONCAT(
            COALESCE(observaciones, ''),
            '\nPago anulado por cancelación: ',
            ?
          )
      WHERE id_renta = ?
        AND id_empresa = ?
      `,
      [motivo_cancelacion.trim(), id, id_empresa]
    );

    await connection.query(
      `
      UPDATE dumpsters
      SET estado = 'disponible'
      WHERE id_dumpster = ?
        AND id_empresa = ?
      `,
      [rentas[0].id_dumpster, id_empresa]
    );

    await connection.commit();

    res.json({
      ok: true,
      msg: "Renta cancelada correctamente",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al cancelar renta:", error);

    res.status(500).json({
      ok: false,
      msg: "Error al cancelar renta",
    });
  } finally {
    connection.release();
  }
};

const registrarPagoRenta = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const id_empresa = getIdEmpresa(req);
    const creado_por = req.usuario.id_usuario;

    const {
      monto_abonado,
      tipo_pago,
      observaciones,
      aplicar_tax_pago,
      tax_pago,
      conceptos = [],
    } = req.body;

    if (!monto_abonado || Number(monto_abonado) <= 0 || !tipo_pago) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Monto y método de pago son obligatorios",
      });
    }

    const [rows] = await conn.query(
      `
      SELECT
        r.id_cliente,
        f.saldo_pendiente,
        f.total_final,
        f.tax_amount
      FROM tb_rentas r
      INNER JOIN tb_renta_finanzas f ON f.id_renta = r.id_renta
      WHERE r.id_renta = ?
        AND r.id_empresa = ?
      LIMIT 1
      FOR UPDATE
      `,
      [id, id_empresa]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        msg: "Renta no encontrada",
      });
    }

    const saldoActual = Number(rows[0].saldo_pendiente || 0);
    const taxPago = aplicar_tax_pago ? Number(tax_pago || 0) : 0;
    const saldoConTax = saldoActual + taxPago;
    const montoPago = Number(monto_abonado);

    if (saldoActual <= 0) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Esta renta no tiene saldo pendiente",
      });
    }

    if (taxPago < 0) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "El tax no puede ser negativo",
      });
    }

    if (montoPago > saldoConTax) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        msg: "El pago no puede ser mayor al saldo pendiente",
      });
    }

    if (taxPago > 0) {
      await conn.query(
        `
        UPDATE tb_renta_finanzas
        SET tax_amount = tax_amount + ?,
            total_final = total_final + ?,
            saldo_pendiente = saldo_pendiente + ?
        WHERE id_renta = ?
          AND id_empresa = ?
        `,
        [taxPago, taxPago, taxPago, id, id_empresa]
      );
    }

    const nuevoSaldo = Math.max(saldoConTax - montoPago, 0);
    const estado_pago = nuevoSaldo === 0 ? "pagado" : "parcial";

    const extrasTexto = conceptos
      .filter((c) => c.tipo === "extra")
      .map((c) => `Extra #${c.numero_extra}`)
      .join(", ");

    const observacionFinal =
      observaciones ||
      (extrasTexto
        ? `Pago correspondiente a ${extrasTexto}`
        : `Pago registrado en renta #${id}`);

    await conn.query(
      `
      INSERT INTO tb_renta_pagos (
        id_empresa,
        id_renta,
        id_cliente,
        monto_abonado,
        tax_pago,
        tipo_pago,
        estado_pago,
        observaciones,
        creado_por,
        fecha_pago
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        id_empresa,
        id,
        rows[0].id_cliente,
        montoPago,
        taxPago,
        tipo_pago,
        estado_pago,
        observacionFinal,
        creado_por,
      ]
    );

    const extrasPagados = (conceptos || [])
      .filter((c) => c.tipo === "extra" && c.id_extra)
      .map((c) => Number(c.id_extra));

    if (extrasPagados.length > 0) {
      await conn.query(
        `
        UPDATE tb_renta_extras
        SET estado_pago = 'pagado'
        WHERE id_empresa = ?
          AND id_renta = ?
          AND id_extra IN (?)
        `,
        [id_empresa, id, extrasPagados]
      );
    }

    await conn.query(
      `
      UPDATE tb_renta_finanzas
      SET saldo_pendiente = ?
      WHERE id_renta = ?
        AND id_empresa = ?
      `,
      [nuevoSaldo, id, id_empresa]
    );

    await conn.commit();

    await registrarLog({
      req,
      modulo: "Rentas",
      accion: "REGISTRAR_PAGO",
      descripcion: `Pago registrado en renta #${id}: $${montoPago}`,
    });

    res.json({
      ok: true,
      msg: "Pago registrado correctamente",
      saldo_pendiente: nuevoSaldo,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error al registrar pago:", error);

    res.status(500).json({
      ok: false,
      msg: "Error al registrar pago",
    });
  } finally {
    conn.release();
  }
};


const actualizarFechaRetiro = async (req, res) => {
  try {
    const { id } = req.params;
    const id_empresa = getIdEmpresa(req);
    const { fecha_estimada_devolucion } = req.body;

    if (!fecha_estimada_devolucion) {
      return res.status(400).json({
        ok: false,
        msg: "La fecha de retiro es obligatoria",
      });
    }

    const [rows] = await db.query(
      `
      SELECT fecha_inicio
      FROM tb_rentas
      WHERE id_renta = ?
        AND id_empresa = ?
      LIMIT 1
      `,
      [id, id_empresa]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Renta no encontrada",
      });
    }

    const inicio = new Date(rows[0].fecha_inicio);
    const retiro = new Date(fecha_estimada_devolucion);

    if (retiro < inicio) {
      return res.status(400).json({
        ok: false,
        msg: "La fecha de retiro no puede ser menor a la fecha de inicio",
      });
    }

    const diffMs = retiro - inicio;
    const dias_renta = Math.max(1, Math.ceil(diffMs / 86400000));

    await db.query(
      `
      UPDATE tb_rentas
      SET fecha_estimada_devolucion = ?,
          dias_renta = ?,
          fyh_actualizacion = NOW()
      WHERE id_renta = ?
        AND id_empresa = ?
      `,
      [fecha_estimada_devolucion, dias_renta, id, id_empresa]
    );

    await registrarLog({
      req,
      modulo: "Rentas",
      accion: "ACTUALIZAR_FECHA_RETIRO",
      descripcion: `Fecha de retiro actualizada en renta #${id}`,
    });

    res.json({
      ok: true,
      msg: "Fecha de retiro actualizada correctamente",
      dias_renta,
    });
  } catch (error) {
    console.error("Error al actualizar fecha de retiro:", error);

    res.status(500).json({
      ok: false,
      msg: "Error al actualizar fecha de retiro",
    });
  }
};

const inactivarExtraRenta = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id_extra } = req.params;

    const usuarioAuth = req.usuario || req.user || req.userAuth || req.auth || {};

    const id_empresa =
      usuarioAuth.id_empresa ||
      usuarioAuth.empresa_id ||
      usuarioAuth.idEmpresa;

    if (!id_empresa) {
      await connection.rollback();

      console.log("Usuario autenticado recibido:", {
        user: req.user,
        usuario: req.usuario,
        userAuth: req.userAuth,
        auth: req.auth,
      });

      return res.status(400).json({
        msg: "No se pudo identificar la empresa del usuario autenticado",
      });
    }


    const [extras] = await connection.query(
      `
      SELECT id_extra, id_renta, monto, estado_pago
      FROM tb_renta_extras
      WHERE id_extra = ?
        AND id_empresa = ?
      FOR UPDATE
      `,
      [id_extra, id_empresa]
    );

    if (extras.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        msg: "Cargo extra no encontrado",
      });
    }

    const extra = extras[0];

    if (extra.estado_pago !== "pendiente") {
      await connection.rollback();
      return res.status(400).json({
        msg: "Solo se pueden anular cargos extras pendientes",
      });
    }

    const montoExtra = Number(extra.monto || 0);

    await connection.query(
      `
      UPDATE tb_renta_extras
      SET estado_pago = 'anulado'
      WHERE id_extra = ?
        AND id_empresa = ?
        AND estado_pago = 'pendiente'
      `,
      [id_extra, id_empresa]
    );

    await connection.query(
      `
      UPDATE tb_renta_finanzas
      SET
        total_extras = GREATEST(total_extras - ?, 0),
        total_final = GREATEST(total_final - ?, 0),
        saldo_pendiente = GREATEST(saldo_pendiente - ?, 0)
      WHERE id_renta = ?
        AND id_empresa = ?
      `,
      [montoExtra, montoExtra, montoExtra, extra.id_renta, id_empresa]
    );

    await connection.commit();

    return res.json({
      msg: "Cargo extra anulado correctamente",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al anular cargo extra:", error);

    return res.status(500).json({
      msg: "Error al anular cargo extra",
    });
  } finally {
    connection.release();
  }
};



module.exports = {
  getRentasFormData,
  listarRentas,
  crearRenta,
  obtenerRentaDetalle,
  agregarExtraRenta,
  finalizarRenta,
  cancelarRenta,
  inactivarExtraRenta,
  registrarPagoRenta,
  actualizarFechaRetiro,
};