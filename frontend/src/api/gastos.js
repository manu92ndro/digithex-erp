import client from "./client";

export const getGastosFormData = async () =>
  (await client.get("/gastos/form-data")).data;

export const getGastosResumen = async (params = {}) =>
  (await client.get("/gastos/resumen", { params })).data;

export const getGastosCalendario = async (params = {}) =>
  (await client.get("/gastos/calendario", { params })).data;

export const getGastosCategorias = async (params = {}) =>
  (await client.get("/gastos/categorias", { params })).data;

export const createGastoCategoria = async (payload) =>
  (await client.post("/gastos/categorias", payload)).data;

export const updateGastoCategoria = async (id, payload) =>
  (await client.put(`/gastos/categorias/${id}`, payload)).data;

export const updateGastoCategoriaEstado = async (id, estado) =>
  (await client.patch(`/gastos/categorias/${id}/estado`, { estado })).data;

export const getGastos = async (params = {}) =>
  (await client.get("/gastos", { params })).data;

export const createGasto = async (payload) =>
  (await client.post("/gastos", payload)).data;

export const updateGasto = async (id, payload) =>
  (await client.put(`/gastos/${id}`, payload)).data;

export const pagarGasto = async (id, payload) =>
  (await client.patch(`/gastos/${id}/pagar`, payload)).data;

export const anularGasto = async (id, payload = {}) =>
  (await client.patch(`/gastos/${id}/anular`, payload)).data;

export const getGastosProgramados = async (params = {}) =>
  (await client.get("/gastos/programados", { params })).data;

export const createGastoProgramado = async (payload) =>
  (await client.post("/gastos/programados", payload)).data;

export const updateGastoProgramado = async (id, payload) =>
  (await client.put(`/gastos/programados/${id}`, payload)).data;

export const updateGastoProgramadoEstado = async (id, activo) =>
  (await client.patch(`/gastos/programados/${id}/estado`, { activo })).data;

export const pagarGastoProgramado = async (id, payload) =>
  (await client.post(`/gastos/programados/${id}/pagar`, payload)).data;
