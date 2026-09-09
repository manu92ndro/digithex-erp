const express=require("express");
const router=express.Router();

const {
  getFormData,
  getCategorias,postCategoria,putCategoria,patchCategoriaEstado,
  getGastos,getGasto,postGasto,putGasto,patchPagarGasto,patchAnularGasto,
  getProgramados,postProgramado,putProgramado,patchProgramadoEstado,postPagarProgramado,
  getResumen,getCalendario
}=require("./gastos.controller");

const {validarJWT}=require("../../middlewares/auth.middleware");
const {validarPermiso}=require("../../middlewares/permiso.middleware");

// FORM DATA
router.get("/form-data",validarJWT,validarPermiso("gastos.ver"),getFormData);

// RESUMEN / CALENDARIO
router.get("/resumen",validarJWT,validarPermiso("gastos.ver"),getResumen);
router.get("/calendario",validarJWT,validarPermiso("gastos.ver"),getCalendario);

// CATEGORIAS
router.get("/categorias",validarJWT,validarPermiso("gastos.categorias.ver"),getCategorias);
router.post("/categorias",validarJWT,validarPermiso("gastos.categorias.crear"),postCategoria);
router.put("/categorias/:id_categoria",validarJWT,validarPermiso("gastos.categorias.editar"),putCategoria);
router.patch("/categorias/:id_categoria/estado",validarJWT,validarPermiso("gastos.categorias.editar"),patchCategoriaEstado);

// PROGRAMADOS
router.get("/programados",validarJWT,validarPermiso("gastos.programados.ver"),getProgramados);
router.post("/programados",validarJWT,validarPermiso("gastos.programados.crear"),postProgramado);
router.put("/programados/:id_programado",validarJWT,validarPermiso("gastos.programados.editar"),putProgramado);
router.patch("/programados/:id_programado/estado",validarJWT,validarPermiso("gastos.programados.editar"),patchProgramadoEstado);
router.post("/programados/:id_programado/pagar",validarJWT,validarPermiso("gastos.pagar"),postPagarProgramado);

// GASTOS
router.get("/",validarJWT,validarPermiso("gastos.ver"),getGastos);
router.post("/",validarJWT,validarPermiso("gastos.crear"),postGasto);
router.get("/:id_gasto",validarJWT,validarPermiso("gastos.ver"),getGasto);
router.put("/:id_gasto",validarJWT,validarPermiso("gastos.editar"),putGasto);
router.patch("/:id_gasto/pagar",validarJWT,validarPermiso("gastos.pagar"),patchPagarGasto);
router.patch("/:id_gasto/anular",validarJWT,validarPermiso("gastos.eliminar"),patchAnularGasto);

module.exports=router;
