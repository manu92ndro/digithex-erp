const service=require("./gastos.service");

const responderError=(res,error)=>{
  console.error("======================================");
  console.error("ERROR GASTOS:");
  console.error("Mensaje:",error?.message);
  console.error("Código:",error?.code);
  console.error("Stack:",error?.stack);
  console.error("======================================");
  return res.status(error?.status||500).json({
    ok:false,
    code:error?.code||"GASTOS_ERROR",
    message:error?.message||"Error procesando gastos"
  });
};

const getFormData=async(req,res)=>{try{
  const r=await service.obtenerFormData(req.usuario);return res.json({ok:true,...r});
}catch(e){return responderError(res,e);}};

const getCategorias=async(req,res)=>{try{
  const categorias=await service.listarCategorias(req.usuario,req.query);return res.json({ok:true,categorias});
}catch(e){return responderError(res,e);}};

const postCategoria=async(req,res)=>{try{
  const r=await service.crearCategoria(req.usuario,req.body);
  return res.status(201).json({ok:true,message:"Categoría creada correctamente",...r});
}catch(e){return responderError(res,e);}};

const putCategoria=async(req,res)=>{try{
  await service.editarCategoria(req.usuario,req.params.id_categoria,req.body);
  return res.json({ok:true,message:"Categoría actualizada correctamente"});
}catch(e){return responderError(res,e);}};

const patchCategoriaEstado=async(req,res)=>{try{
  await service.estadoCategoria(req.usuario,req.params.id_categoria,req.body);
  return res.json({ok:true,message:"Estado de categoría actualizado correctamente"});
}catch(e){return responderError(res,e);}};

const getGastos=async(req,res)=>{try{
  const gastos=await service.listarGastos(req.usuario,req.query);return res.json({ok:true,gastos});
}catch(e){return responderError(res,e);}};

const getGasto=async(req,res)=>{try{
  const gasto=await service.detalleGasto(req.usuario,req.params.id_gasto);return res.json({ok:true,gasto});
}catch(e){return responderError(res,e);}};

const postGasto=async(req,res)=>{try{
  const r=await service.crearGasto(req.usuario,req.body);
  return res.status(201).json({ok:true,message:"Gasto registrado correctamente",...r});
}catch(e){return responderError(res,e);}};

const putGasto=async(req,res)=>{try{
  await service.editarGasto(req.usuario,req.params.id_gasto,req.body);
  return res.json({ok:true,message:"Gasto actualizado correctamente"});
}catch(e){return responderError(res,e);}};

const patchPagarGasto=async(req,res)=>{try{
  await service.pagarGasto(req.usuario,req.params.id_gasto,req.body);
  return res.json({ok:true,message:"Pago registrado correctamente"});
}catch(e){return responderError(res,e);}};

const patchAnularGasto=async(req,res)=>{try{
  await service.anularGasto(req.usuario,req.params.id_gasto,req.body);
  return res.json({ok:true,message:"Gasto anulado correctamente"});
}catch(e){return responderError(res,e);}};

const getProgramados=async(req,res)=>{try{
  const programados=await service.listarProgramados(req.usuario,req.query);return res.json({ok:true,programados});
}catch(e){return responderError(res,e);}};

const postProgramado=async(req,res)=>{try{
  const r=await service.crearProgramado(req.usuario,req.body);
  return res.status(201).json({ok:true,message:"Pago programado creado correctamente",...r});
}catch(e){return responderError(res,e);}};

const putProgramado=async(req,res)=>{try{
  await service.editarProgramado(req.usuario,req.params.id_programado,req.body);
  return res.json({ok:true,message:"Pago programado actualizado correctamente"});
}catch(e){return responderError(res,e);}};

const patchProgramadoEstado=async(req,res)=>{try{
  await service.estadoProgramado(req.usuario,req.params.id_programado,req.body);
  return res.json({ok:true,message:"Estado del pago programado actualizado correctamente"});
}catch(e){return responderError(res,e);}};

const postPagarProgramado=async(req,res)=>{try{
  const r=await service.pagarProgramado(req.usuario,req.params.id_programado,req.body);
  return res.json({
    ok:true,
    message:r.programado_activo
      ?"Pago registrado y próximo vencimiento actualizado"
      :"Pago registrado y programación finalizada",
    ...r
  });
}catch(e){return responderError(res,e);}};

const getResumen=async(req,res)=>{try{
  const resumen=await service.obtenerResumen(req.usuario,req.query);return res.json({ok:true,resumen});
}catch(e){return responderError(res,e);}};

const getCalendario=async(req,res)=>{try{
  const eventos=await service.obtenerCalendario(req.usuario,req.query);return res.json({ok:true,eventos});
}catch(e){return responderError(res,e);}};

module.exports={
  getFormData,
  getCategorias,postCategoria,putCategoria,patchCategoriaEstado,
  getGastos,getGasto,postGasto,putGasto,patchPagarGasto,patchAnularGasto,
  getProgramados,postProgramado,putProgramado,patchProgramadoEstado,postPagarProgramado,
  getResumen,getCalendario
};
