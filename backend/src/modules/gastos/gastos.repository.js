const pool = require("../../shared/database/db");

const listarCategorias = async ({ id_empresa, solo_activas = false }) => {
  const [rows] = await pool.query(`
    SELECT id_categoria,id_empresa,nombre_categoria,descripcion,estado,fyh_creacion,fyh_actualizacion
    FROM tb_gastos_categorias
    WHERE id_empresa = ? ${solo_activas ? "AND estado = 1" : ""}
    ORDER BY estado DESC,nombre_categoria ASC
  `,[id_empresa]);
  return rows;
};

const obtenerCategoria = async (connection,{id_empresa,id_categoria,solo_activa=false}) => {
  const db = connection || pool;
  const [rows] = await db.query(`
    SELECT id_categoria,id_empresa,nombre_categoria,descripcion,estado
    FROM tb_gastos_categorias
    WHERE id_empresa=? AND id_categoria=? ${solo_activa ? "AND estado=1" : ""}
    LIMIT 1
  `,[id_empresa,id_categoria]);
  return rows[0] || null;
};

const categoriaDuplicada = async (connection,{id_empresa,nombre_categoria,excluir_id=null}) => {
  const params=[id_empresa,nombre_categoria];
  let extra="";
  if(excluir_id){ extra="AND id_categoria<>?"; params.push(excluir_id); }
  const [rows]=await connection.query(`
    SELECT id_categoria FROM tb_gastos_categorias
    WHERE id_empresa=? AND LOWER(TRIM(nombre_categoria))=LOWER(TRIM(?)) ${extra}
    LIMIT 1
  `,params);
  return rows[0] || null;
};

const crearCategoria = async (connection,data) => {
  const [r]=await connection.query(`
    INSERT INTO tb_gastos_categorias
    (id_empresa,nombre_categoria,descripcion,estado,fyh_creacion)
    VALUES(?,?,?,1,NOW())
  `,[data.id_empresa,data.nombre_categoria,data.descripcion||null]);
  return r.insertId;
};

const actualizarCategoria = async (connection,data) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos_categorias
    SET nombre_categoria=?,descripcion=?,fyh_actualizacion=NOW()
    WHERE id_categoria=? AND id_empresa=?
  `,[data.nombre_categoria,data.descripcion||null,data.id_categoria,data.id_empresa]);
  return r.affectedRows>0;
};

const cambiarEstadoCategoria = async (connection,data) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos_categorias SET estado=?,fyh_actualizacion=NOW()
    WHERE id_categoria=? AND id_empresa=?
  `,[data.estado,data.id_categoria,data.id_empresa]);
  return r.affectedRows>0;
};

const listarGastos = async ({id_empresa,fecha_desde,fecha_hasta,id_categoria,estado,buscar}) => {
  const params=[id_empresa];
  const f=[];
  if(fecha_desde){f.push("g.fecha_vencimiento>=?");params.push(fecha_desde);}
  if(fecha_hasta){f.push("g.fecha_vencimiento<?");params.push(fecha_hasta);}
  if(id_categoria){f.push("g.id_categoria=?");params.push(id_categoria);}
  if(estado==="vencido"){f.push("g.estado='pendiente' AND g.fecha_vencimiento<CURDATE()");}
  else if(estado==="pendiente"){f.push("g.estado='pendiente' AND g.fecha_vencimiento>=CURDATE()");}
  else if(["pagado","anulado"].includes(estado)){f.push("g.estado=?");params.push(estado);}
  if(buscar){
    f.push("(g.concepto LIKE ? OR g.descripcion LIKE ? OR g.referencia LIKE ? OR c.nombre_categoria LIKE ?)");
    const q=`%${buscar}%`; params.push(q,q,q,q);
  }
  const extra=f.length?`AND ${f.join(" AND ")}`:"";
  const [rows]=await pool.query(`
    SELECT g.*,c.nombre_categoria,u.nombres AS creado_por_nombre,
      DATE_FORMAT(g.fecha_vencimiento,'%Y-%m-%d') AS fecha_vencimiento,
      DATE_FORMAT(g.fecha_pago,'%Y-%m-%d') AS fecha_pago,
      CASE WHEN g.estado='pendiente' AND g.fecha_vencimiento<CURDATE()
        THEN 'vencido' ELSE g.estado END AS estado_visual
    FROM tb_gastos g
    INNER JOIN tb_gastos_categorias c
      ON c.id_categoria=g.id_categoria AND c.id_empresa=g.id_empresa
    LEFT JOIN tb_usuarios u ON u.id_usuario=g.creado_por
    WHERE g.id_empresa=? ${extra}
    ORDER BY g.fecha_vencimiento DESC,g.id_gasto DESC
  `,params);
  return rows;
};

const obtenerGasto = async (connection,{id_empresa,id_gasto,for_update=false}) => {
  const db=connection||pool;
  const [rows]=await db.query(`
    SELECT g.*,c.nombre_categoria,
      DATE_FORMAT(g.fecha_vencimiento,'%Y-%m-%d') AS fecha_vencimiento,
      DATE_FORMAT(g.fecha_pago,'%Y-%m-%d') AS fecha_pago,
      CASE WHEN g.estado='pendiente' AND g.fecha_vencimiento<CURDATE()
        THEN 'vencido' ELSE g.estado END AS estado_visual
    FROM tb_gastos g
    INNER JOIN tb_gastos_categorias c
      ON c.id_categoria=g.id_categoria AND c.id_empresa=g.id_empresa
    WHERE g.id_empresa=? AND g.id_gasto=?
    LIMIT 1 ${for_update?"FOR UPDATE":""}
  `,[id_empresa,id_gasto]);
  return rows[0]||null;
};

const crearGasto = async (connection,d) => {
  const [r]=await connection.query(`
    INSERT INTO tb_gastos
    (id_empresa,id_categoria,id_programado,concepto,descripcion,referencia,monto,
     fecha_vencimiento,fecha_pago,estado,metodo_pago,observaciones,creado_por,fyh_creacion)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())
  `,[d.id_empresa,d.id_categoria,d.id_programado||null,d.concepto,d.descripcion||null,d.referencia||null,
     d.monto,d.fecha_vencimiento,d.fecha_pago||null,d.estado,d.metodo_pago||null,d.observaciones||null,d.creado_por]);
  return r.insertId;
};

const actualizarGasto = async (connection,d) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos SET id_categoria=?,concepto=?,descripcion=?,referencia=?,monto=?,
      fecha_vencimiento=?,observaciones=?,fyh_actualizacion=NOW()
    WHERE id_gasto=? AND id_empresa=? AND estado='pendiente'
  `,[d.id_categoria,d.concepto,d.descripcion||null,d.referencia||null,d.monto,d.fecha_vencimiento,
     d.observaciones||null,d.id_gasto,d.id_empresa]);
  return r.affectedRows>0;
};

const pagarGasto = async (connection,d) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos SET monto=?,fecha_pago=?,metodo_pago=?,referencia=COALESCE(?,referencia),
      observaciones=COALESCE(?,observaciones),estado='pagado',fyh_actualizacion=NOW()
    WHERE id_gasto=? AND id_empresa=? AND estado='pendiente'
  `,[d.monto,d.fecha_pago,d.metodo_pago,d.referencia||null,d.observaciones||null,d.id_gasto,d.id_empresa]);
  return r.affectedRows>0;
};

const anularGasto = async (connection,d) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos SET estado='anulado',observaciones=COALESCE(?,observaciones),fyh_actualizacion=NOW()
    WHERE id_gasto=? AND id_empresa=? AND estado<>'anulado'
  `,[d.observaciones||null,d.id_gasto,d.id_empresa]);
  return r.affectedRows>0;
};

const listarProgramados = async ({id_empresa,solo_activos=false,id_categoria=null}) => {
  const params=[id_empresa]; const f=[];
  if(solo_activos) f.push("p.activo=1");
  if(id_categoria){f.push("p.id_categoria=?");params.push(id_categoria);}
  const extra=f.length?`AND ${f.join(" AND ")}`:"";
  const [rows]=await pool.query(`
    SELECT p.*,c.nombre_categoria,u.nombres AS creado_por_nombre,
      DATE_FORMAT(p.fecha_inicio,'%Y-%m-%d') AS fecha_inicio,
      DATE_FORMAT(p.fecha_proximo_pago,'%Y-%m-%d') AS fecha_proximo_pago,
      CASE WHEN p.activo=0 THEN 'inactivo'
        WHEN p.fecha_proximo_pago<CURDATE() THEN 'vencido'
        WHEN p.fecha_proximo_pago=CURDATE() THEN 'hoy'
        ELSE 'pendiente' END AS estado_visual
    FROM tb_gastos_programados p
    INNER JOIN tb_gastos_categorias c
      ON c.id_categoria=p.id_categoria AND c.id_empresa=p.id_empresa
    LEFT JOIN tb_usuarios u ON u.id_usuario=p.creado_por
    WHERE p.id_empresa=? ${extra}
    ORDER BY p.activo DESC,p.fecha_proximo_pago ASC,p.nombre ASC
  `,params);
  return rows;
};

const obtenerProgramado = async (connection,{id_empresa,id_programado,for_update=false}) => {
  const db=connection||pool;
  const [rows]=await db.query(`
    SELECT p.*,c.nombre_categoria,
      DATE_FORMAT(p.fecha_inicio,'%Y-%m-%d') AS fecha_inicio,
      DATE_FORMAT(p.fecha_proximo_pago,'%Y-%m-%d') AS fecha_proximo_pago
    FROM tb_gastos_programados p
    INNER JOIN tb_gastos_categorias c
      ON c.id_categoria=p.id_categoria AND c.id_empresa=p.id_empresa
    WHERE p.id_empresa=? AND p.id_programado=?
    LIMIT 1 ${for_update?"FOR UPDATE":""}
  `,[id_empresa,id_programado]);
  return rows[0]||null;
};

const crearProgramado = async (connection,d) => {
  const [r]=await connection.query(`
    INSERT INTO tb_gastos_programados
    (id_empresa,id_categoria,nombre,descripcion,monto_estimado,frecuencia,dia_pago,
     fecha_inicio,fecha_proximo_pago,activo,creado_por,fyh_creacion)
    VALUES(?,?,?,?,?,?,?,?,?,1,?,NOW())
  `,[d.id_empresa,d.id_categoria,d.nombre,d.descripcion||null,d.monto_estimado,d.frecuencia,
     d.dia_pago||null,d.fecha_inicio,d.fecha_proximo_pago,d.creado_por]);
  return r.insertId;
};

const actualizarProgramado = async (connection,d) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos_programados SET id_categoria=?,nombre=?,descripcion=?,monto_estimado=?,
      frecuencia=?,dia_pago=?,fecha_inicio=?,fecha_proximo_pago=?,fyh_actualizacion=NOW()
    WHERE id_programado=? AND id_empresa=?
  `,[d.id_categoria,d.nombre,d.descripcion||null,d.monto_estimado,d.frecuencia,d.dia_pago||null,
     d.fecha_inicio,d.fecha_proximo_pago,d.id_programado,d.id_empresa]);
  return r.affectedRows>0;
};

const cambiarEstadoProgramado = async (connection,d) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos_programados SET activo=?,fyh_actualizacion=NOW()
    WHERE id_programado=? AND id_empresa=?
  `,[d.activo,d.id_programado,d.id_empresa]);
  return r.affectedRows>0;
};

const actualizarProximoPago = async (connection,d) => {
  const [r]=await connection.query(`
    UPDATE tb_gastos_programados SET fecha_proximo_pago=?,activo=?,fyh_actualizacion=NOW()
    WHERE id_programado=? AND id_empresa=?
  `,[d.fecha_proximo_pago,d.activo,d.id_programado,d.id_empresa]);
  return r.affectedRows>0;
};

const existePagoProgramado = async (connection,{id_empresa,id_programado,fecha_vencimiento}) => {
  const [rows]=await connection.query(`
    SELECT id_gasto FROM tb_gastos
    WHERE id_empresa=? AND id_programado=? AND fecha_vencimiento=? AND estado<>'anulado'
    LIMIT 1
  `,[id_empresa,id_programado,fecha_vencimiento]);
  return rows[0]||null;
};

const obtenerResumen = async ({id_empresa,fecha_desde,fecha_hasta}) => {
  const [g]=await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN estado='pagado' THEN monto ELSE 0 END),0) total_pagado,
      COALESCE(SUM(CASE WHEN estado='pendiente' AND fecha_vencimiento>=CURDATE() THEN monto ELSE 0 END),0) total_pendiente,
      COALESCE(SUM(CASE WHEN estado='pendiente' AND fecha_vencimiento<CURDATE() THEN monto ELSE 0 END),0) total_vencido,
      SUM(CASE WHEN estado='pagado' THEN 1 ELSE 0 END) cantidad_pagados,
      SUM(CASE WHEN estado='pendiente' THEN 1 ELSE 0 END) cantidad_pendientes
    FROM tb_gastos
    WHERE id_empresa=? AND fecha_vencimiento>=? AND fecha_vencimiento<? AND estado<>'anulado'
  `,[id_empresa,fecha_desde,fecha_hasta]);
  const [p]=await pool.query(`
    SELECT COUNT(*) cantidad_programados,
      SUM(CASE WHEN fecha_proximo_pago<CURDATE() THEN 1 ELSE 0 END) programados_vencidos,
      COALESCE(SUM(CASE WHEN fecha_proximo_pago>=? AND fecha_proximo_pago<? THEN monto_estimado ELSE 0 END),0)
        estimado_programado_periodo
    FROM tb_gastos_programados WHERE id_empresa=? AND activo=1
  `,[fecha_desde,fecha_hasta,id_empresa]);
  return {...(g[0]||{}),...(p[0]||{})};
};

const obtenerCalendario = async ({id_empresa,fecha_desde,fecha_hasta}) => {
  const [g]=await pool.query(`
    SELECT g.id_gasto id,'gasto' tipo,g.id_categoria,c.nombre_categoria,g.concepto nombre,g.monto,
      DATE_FORMAT(g.fecha_vencimiento,'%Y-%m-%d') fecha,g.estado,
      CASE WHEN g.estado='pendiente' AND g.fecha_vencimiento<CURDATE() THEN 'vencido' ELSE g.estado END estado_visual,
      g.id_programado
    FROM tb_gastos g
    INNER JOIN tb_gastos_categorias c ON c.id_categoria=g.id_categoria AND c.id_empresa=g.id_empresa
    WHERE g.id_empresa=? AND g.fecha_vencimiento>=? AND g.fecha_vencimiento<? AND g.estado<>'anulado'
  `,[id_empresa,fecha_desde,fecha_hasta]);
  const [p]=await pool.query(`
    SELECT p.id_programado id,'programado' tipo,p.id_categoria,c.nombre_categoria,p.nombre,p.monto_estimado monto,
      DATE_FORMAT(p.fecha_proximo_pago,'%Y-%m-%d') fecha,'pendiente' estado,
      CASE WHEN p.fecha_proximo_pago<CURDATE() THEN 'vencido'
           WHEN p.fecha_proximo_pago=CURDATE() THEN 'hoy' ELSE 'pendiente' END estado_visual,
      p.frecuencia
    FROM tb_gastos_programados p
    INNER JOIN tb_gastos_categorias c ON c.id_categoria=p.id_categoria AND c.id_empresa=p.id_empresa
    WHERE p.id_empresa=? AND p.activo=1 AND p.fecha_proximo_pago>=? AND p.fecha_proximo_pago<?
  `,[id_empresa,fecha_desde,fecha_hasta]);
  return [...g,...p].sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
};

module.exports={
  listarCategorias,obtenerCategoria,categoriaDuplicada,crearCategoria,actualizarCategoria,cambiarEstadoCategoria,
  listarGastos,obtenerGasto,crearGasto,actualizarGasto,pagarGasto,anularGasto,
  listarProgramados,obtenerProgramado,crearProgramado,actualizarProgramado,cambiarEstadoProgramado,
  actualizarProximoPago,existePagoProgramado,obtenerResumen,obtenerCalendario
};
