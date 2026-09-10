const pool=require("../../shared/database/db");
const repository=require("./gastos.repository");

const METODOS=["cash","card","transfer","check","other"];
const FRECUENCIAS=["unico","semanal","mensual","anual"];

const err=(message,status=400,code="GASTOS_ERROR")=>{
  const e=new Error(message); e.status=status; e.code=code; return e;
};
const txt=(v,max=null)=>{const s=String(v??"").trim(); if(!s)return null; return max?s.slice(0,max):s;};
const num=(v)=>{const n=Number(v); return Number.isFinite(n)&&n>0?Math.round(n*100)/100:null;};
const fechaOk=(v)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||"")))return false;
  const [y,m,d]=String(v).split("-").map(Number);
  const f=new Date(y,m-1,d,12); return f.getFullYear()===y&&f.getMonth()===m-1&&f.getDate()===d;
};
const iso=(y,m,d)=>`${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const diasMes=(y,m)=>new Date(y,m,0).getDate();
const INTERVALOS_MESES=[1,3,6,9,12];

const siguienteFecha=(actual,frecuencia,diaPago=null,intervaloMeses=1)=>{
  if(!fechaOk(actual))throw err("Fecha inválida");
  const [y0,m0,d0]=actual.split("-").map(Number);
  if(frecuencia==="unico")return null;
  if(frecuencia==="semanal"){
    const f=new Date(y0,m0-1,d0,12); f.setDate(f.getDate()+7);
    return iso(f.getFullYear(),f.getMonth()+1,f.getDate());
  }
  if(frecuencia==="mensual"){
    const intervalo=INTERVALOS_MESES.includes(Number(intervaloMeses))?Number(intervaloMeses):1;
    const baseMes=(m0-1)+intervalo;
    const y=y0+Math.floor(baseMes/12);
    const m=(baseMes%12)+1;
    return iso(y,m,Math.min(Number(diaPago)||d0,diasMes(y,m)));
  }
  if(frecuencia==="anual"){
    const y=y0+1,m=m0;
    return iso(y,m,Math.min(Number(diaPago)||d0,diasMes(y,m)));
  }
  throw err("Frecuencia no válida",400,"GASTOS_FRECUENCIA_INVALIDA");
};
const sesion=(usuario)=>{
  const id_empresa=Number(usuario?.id_empresa),id_usuario=Number(usuario?.id_usuario);
  if(!id_empresa||!id_usuario)throw err("Sesión de empresa no válida",401,"GASTOS_SESION_INVALIDA");
  return {id_empresa,id_usuario};
};
const validarCategoria=async(connection,id_empresa,id_categoria)=>{
  const c=await repository.obtenerCategoria(connection,{id_empresa,id_categoria,solo_activa:true});
  if(!c)throw err("La categoría no existe o está inactiva",400,"GASTOS_CATEGORIA_INVALIDA");
  return c;
};

const obtenerFormData=async(usuario)=>{
  const {id_empresa}=sesion(usuario);
  return {
    categorias:await repository.listarCategorias({id_empresa,solo_activas:true}),
    metodos_pago:METODOS,
    frecuencias:FRECUENCIAS,
    intervalos_meses:INTERVALOS_MESES,
    estados:["pendiente","pagado","anulado"]
  };
};

// CATEGORIAS
const listarCategorias=async(usuario,q={})=>{
  const {id_empresa}=sesion(usuario);
  return repository.listarCategorias({id_empresa,solo_activas:String(q.solo_activas||"")==="1"});
};

const crearCategoria=async(usuario,body)=>{
  const {id_empresa}=sesion(usuario);
  const nombre_categoria=txt(body?.nombre_categoria,100),descripcion=txt(body?.descripcion,255);
  if(!nombre_categoria)throw err("El nombre de la categoría es obligatorio");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    if(await repository.categoriaDuplicada(c,{id_empresa,nombre_categoria}))
      throw err("Ya existe una categoría con ese nombre",409,"GASTOS_CATEGORIA_DUPLICADA");
    const id_categoria=await repository.crearCategoria(c,{id_empresa,nombre_categoria,descripcion});
    await c.commit(); return {id_categoria};
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const editarCategoria=async(usuario,id,body)=>{
  const {id_empresa}=sesion(usuario); const id_categoria=Number(id);
  const nombre_categoria=txt(body?.nombre_categoria,100),descripcion=txt(body?.descripcion,255);
  if(!id_categoria||!nombre_categoria)throw err("Datos de categoría no válidos");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    if(!await repository.obtenerCategoria(c,{id_empresa,id_categoria}))throw err("Categoría no encontrada",404);
    if(await repository.categoriaDuplicada(c,{id_empresa,nombre_categoria,excluir_id:id_categoria}))
      throw err("Ya existe otra categoría con ese nombre",409);
    await repository.actualizarCategoria(c,{id_empresa,id_categoria,nombre_categoria,descripcion});
    await c.commit(); return true;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const estadoCategoria=async(usuario,id,body)=>{
  const {id_empresa}=sesion(usuario); const id_categoria=Number(id),estado=Number(body?.estado);
  if(!id_categoria||![0,1].includes(estado))throw err("Estado de categoría no válido");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    if(!await repository.obtenerCategoria(c,{id_empresa,id_categoria}))throw err("Categoría no encontrada",404);
    await repository.cambiarEstadoCategoria(c,{id_empresa,id_categoria,estado});
    await c.commit(); return true;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

// GASTOS
const listarGastos=async(usuario,q={})=>{
  const {id_empresa}=sesion(usuario);
  const estado=txt(q.estado);
  if(estado&&!["pendiente","pagado","anulado","vencido"].includes(estado))throw err("Estado no válido");
  return repository.listarGastos({
    id_empresa,
    fecha_desde:fechaOk(q.fecha_desde)?q.fecha_desde:null,
    fecha_hasta:fechaOk(q.fecha_hasta)?q.fecha_hasta:null,
    id_categoria:Number(q.id_categoria)||null,
    estado,
    buscar:txt(q.buscar,120)
  });
};

const detalleGasto=async(usuario,id)=>{
  const {id_empresa}=sesion(usuario); const id_gasto=Number(id);
  const g=id_gasto?await repository.obtenerGasto(null,{id_empresa,id_gasto}):null;
  if(!g)throw err("Gasto no encontrado",404,"GASTOS_NO_ENCONTRADO");
  return g;
};

const crearGasto=async(usuario,body)=>{
  const {id_empresa,id_usuario}=sesion(usuario);
  const id_categoria=Number(body?.id_categoria),concepto=txt(body?.concepto,150),monto=num(body?.monto);
  const fecha_vencimiento=txt(body?.fecha_vencimiento),estado=txt(body?.estado)||"pendiente";
  if(!id_categoria||!concepto||monto===null||!fechaOk(fecha_vencimiento))
    throw err("Categoría, concepto, monto y fecha de vencimiento son obligatorios");
  if(!["pendiente","pagado"].includes(estado))throw err("Estado inicial no válido");
  const fecha_pago=txt(body?.fecha_pago),metodo_pago=txt(body?.metodo_pago);
  if(estado==="pagado"&&(!fechaOk(fecha_pago)||!METODOS.includes(metodo_pago)))
    throw err("Para un gasto pagado indique fecha y método de pago");

  const c=await pool.getConnection();
  try{
    await c.beginTransaction(); await validarCategoria(c,id_empresa,id_categoria);
    const id_gasto=await repository.crearGasto(c,{
      id_empresa,id_categoria,id_programado:null,concepto,descripcion:txt(body?.descripcion),
      referencia:txt(body?.referencia,100),monto,fecha_vencimiento,
      fecha_pago:estado==="pagado"?fecha_pago:null,estado,
      metodo_pago:estado==="pagado"?metodo_pago:null,
      observaciones:txt(body?.observaciones),creado_por:id_usuario
    });
    await c.commit();return{id_gasto};
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const editarGasto=async(usuario,id,body)=>{
  const {id_empresa}=sesion(usuario); const id_gasto=Number(id),id_categoria=Number(body?.id_categoria);
  const concepto=txt(body?.concepto,150),monto=num(body?.monto),fecha_vencimiento=txt(body?.fecha_vencimiento);
  if(!id_gasto||!id_categoria||!concepto||monto===null||!fechaOk(fecha_vencimiento))throw err("Datos del gasto no válidos");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const g=await repository.obtenerGasto(c,{id_empresa,id_gasto,for_update:true});
    if(!g)throw err("Gasto no encontrado",404);
    if(g.estado!=="pendiente")throw err("Solo se pueden editar gastos pendientes",409);
    await validarCategoria(c,id_empresa,id_categoria);
    await repository.actualizarGasto(c,{id_empresa,id_gasto,id_categoria,concepto,descripcion:txt(body?.descripcion),
      referencia:txt(body?.referencia,100),monto,fecha_vencimiento,observaciones:txt(body?.observaciones)});
    await c.commit();return true;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const pagarGasto=async(usuario,id,body)=>{
  const {id_empresa}=sesion(usuario);const id_gasto=Number(id),monto=num(body?.monto);
  const fecha_pago=txt(body?.fecha_pago),metodo_pago=txt(body?.metodo_pago);
  if(!id_gasto||monto===null||!fechaOk(fecha_pago)||!METODOS.includes(metodo_pago))
    throw err("Monto, fecha y método de pago son obligatorios");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const g=await repository.obtenerGasto(c,{id_empresa,id_gasto,for_update:true});
    if(!g)throw err("Gasto no encontrado",404);
    if(g.estado!=="pendiente")throw err("Este gasto ya no está pendiente",409);
    await repository.pagarGasto(c,{id_empresa,id_gasto,monto,fecha_pago,metodo_pago,
      referencia:txt(body?.referencia,100),observaciones:txt(body?.observaciones)});
    await c.commit();return true;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const anularGasto=async(usuario,id,body={})=>{
  const {id_empresa}=sesion(usuario);const id_gasto=Number(id);
  if(!id_gasto)throw err("Gasto no válido");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const g=await repository.obtenerGasto(c,{id_empresa,id_gasto,for_update:true});
    if(!g)throw err("Gasto no encontrado",404);
    if(g.estado==="anulado")throw err("El gasto ya está anulado",409);
    await repository.anularGasto(c,{id_empresa,id_gasto,observaciones:txt(body?.observaciones)});
    await c.commit();return true;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

// PROGRAMADOS
const normalizarProgramado=(body)=>{
  const d={
    id_categoria:Number(body?.id_categoria),nombre:txt(body?.nombre,150),descripcion:txt(body?.descripcion),
    monto_estimado:(body?.monto_estimado===null||body?.monto_estimado===""||body?.monto_estimado===undefined)
      ?null:num(body?.monto_estimado),
    frecuencia:txt(body?.frecuencia)||"mensual",
    intervalo_meses:Number(body?.intervalo_meses||1),
    dia_pago:(body?.dia_pago===null||body?.dia_pago===""||body?.dia_pago===undefined)?null:Number(body?.dia_pago),
    fecha_inicio:txt(body?.fecha_inicio),fecha_proximo_pago:txt(body?.fecha_proximo_pago)
  };
  if(!d.id_categoria||!d.nombre||!FRECUENCIAS.includes(d.frecuencia)||!fechaOk(d.fecha_inicio)||!fechaOk(d.fecha_proximo_pago))
    throw err("Datos del pago programado no válidos");
  if(d.frecuencia==="mensual"&&!INTERVALOS_MESES.includes(d.intervalo_meses))
    throw err("El intervalo mensual debe ser 1, 3, 6, 9 o 12 meses");
  if(["mensual","anual"].includes(d.frecuencia)&&(!Number.isInteger(d.dia_pago)||d.dia_pago<1||d.dia_pago>31))
    throw err("El día de pago debe estar entre 1 y 31");
  if(!["mensual","anual"].includes(d.frecuencia))d.dia_pago=null;
  if(d.frecuencia!=="mensual")d.intervalo_meses=1;
  return d;
};

const listarProgramados=async(usuario,q={})=>{
  const {id_empresa}=sesion(usuario);
  return repository.listarProgramados({id_empresa,solo_activos:String(q.solo_activos||"")==="1",
    id_categoria:Number(q.id_categoria)||null});
};

const crearProgramado=async(usuario,body)=>{
  const {id_empresa,id_usuario}=sesion(usuario);const d=normalizarProgramado(body);
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();await validarCategoria(c,id_empresa,d.id_categoria);
    const id_programado=await repository.crearProgramado(c,{id_empresa,...d,creado_por:id_usuario});
    await c.commit();return{id_programado};
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const editarProgramado=async(usuario,id,body)=>{
  const {id_empresa}=sesion(usuario);const id_programado=Number(id),d=normalizarProgramado(body);
  if(!id_programado)throw err("Pago programado no válido");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    if(!await repository.obtenerProgramado(c,{id_empresa,id_programado,for_update:true}))throw err("Pago programado no encontrado",404);
    await validarCategoria(c,id_empresa,d.id_categoria);
    await repository.actualizarProgramado(c,{id_empresa,id_programado,...d});
    await c.commit();return true;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const estadoProgramado=async(usuario,id,body)=>{
  const {id_empresa}=sesion(usuario);const id_programado=Number(id),activo=Number(body?.activo);
  if(!id_programado||![0,1].includes(activo))throw err("Estado no válido");
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    if(!await repository.obtenerProgramado(c,{id_empresa,id_programado,for_update:true}))throw err("Pago programado no encontrado",404);
    await repository.cambiarEstadoProgramado(c,{id_empresa,id_programado,activo});
    await c.commit();return true;
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const pagarProgramado=async(usuario,id,body)=>{
  const {id_empresa,id_usuario}=sesion(usuario);const id_programado=Number(id),monto=num(body?.monto);
  const fecha_pago=txt(body?.fecha_pago),metodo_pago=txt(body?.metodo_pago);
  if(!id_programado||monto===null||!fechaOk(fecha_pago)||!METODOS.includes(metodo_pago))
    throw err("Monto, fecha y método de pago son obligatorios");

  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const p=await repository.obtenerProgramado(c,{id_empresa,id_programado,for_update:true});
    if(!p)throw err("Pago programado no encontrado",404);
    if(Number(p.activo)!==1)throw err("El pago programado está inactivo",409);
    const venc=p.fecha_proximo_pago;
    if(await repository.existePagoProgramado(c,{id_empresa,id_programado,fecha_vencimiento:venc}))
      throw err("Este vencimiento ya fue registrado",409);
    const id_gasto=await repository.crearGasto(c,{
      id_empresa,id_categoria:p.id_categoria,id_programado,concepto:p.nombre,descripcion:p.descripcion,
      referencia:txt(body?.referencia,100),monto,fecha_vencimiento:venc,fecha_pago,estado:"pagado",
      metodo_pago,observaciones:txt(body?.observaciones),creado_por:id_usuario
    });
    const sig=siguienteFecha(venc,p.frecuencia,p.dia_pago,p.intervalo_meses);
    await repository.actualizarProximoPago(c,{
      id_empresa,id_programado,fecha_proximo_pago:sig||venc,activo:sig?1:0
    });
    await c.commit();
    return{id_gasto,fecha_proximo_pago:sig,programado_activo:Boolean(sig)};
  }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const rangoMes=()=>{
  const n=new Date(),y=n.getFullYear(),m=n.getMonth()+1;
  let y2=y,m2=m+1;if(m2>12){m2=1;y2++;}
  return{desde:iso(y,m,1),hasta:iso(y2,m2,1)};
};

const obtenerResumen=async(usuario,q={})=>{
  const {id_empresa}=sesion(usuario),r=rangoMes();
  const fecha_desde=fechaOk(q.fecha_desde)?q.fecha_desde:r.desde;
  const fecha_hasta=fechaOk(q.fecha_hasta)?q.fecha_hasta:r.hasta;
  if(fecha_desde>=fecha_hasta)throw err("Rango de fechas no válido");
  return repository.obtenerResumen({id_empresa,fecha_desde,fecha_hasta});
};

const obtenerCalendario=async(usuario,q={})=>{
  const {id_empresa}=sesion(usuario),fecha_desde=txt(q.fecha_desde),fecha_hasta=txt(q.fecha_hasta);
  if(!fechaOk(fecha_desde)||!fechaOk(fecha_hasta)||fecha_desde>=fecha_hasta)throw err("Rango de fechas no válido");
  return repository.obtenerCalendario({id_empresa,fecha_desde,fecha_hasta});
};

module.exports={
  obtenerFormData,
  listarCategorias,crearCategoria,editarCategoria,estadoCategoria,
  listarGastos,detalleGasto,crearGasto,editarGasto,pagarGasto,anularGasto,
  listarProgramados,crearProgramado,editarProgramado,estadoProgramado,pagarProgramado,
  obtenerResumen,obtenerCalendario,siguienteFecha
};
