# Módulo Rentals — DigiThex ERP

Refactor completo del controlador original a arquitectura:

- Routes: endpoints y middlewares.
- Controller: recibe `req/res`.
- Services: reglas de negocio y transacciones.
- Repositories: SQL.
- Validators: validaciones de entrada.
- Constants: estados.
- Utils: errores, empresa, dinero, fechas y transacciones.

## Endpoints conservados

- GET `/api/rentas/form-data`
- GET `/api/rentas`
- GET `/api/rentas/:id`
- POST `/api/rentas`
- POST `/api/rentas/:id/extras`
- PATCH `/api/rentas/:id/finalizar`
- POST `/api/rentas/:id/pagos`
- PATCH `/api/rentas/:id/fecha-retiro`
- PATCH `/api/rentas/:id/cancelar`
- PATCH `/api/rentas/extras/:id_extra/inactivar`

## Funcionalidad preservada

- Catálogos para crear rentas.
- Listado y detalle.
- Creación transaccional con finanzas, pago inicial y bloqueo del dumpster.
- Extras y recálculo financiero.
- Pagos, tax de pago, conceptos y extras pagados.
- Finalización y liberación del dumpster.
- Cancelación, anulación de pagos y saldo pendiente en cero.
- Reagendamiento de fecha de retiro.
- Anulación de extras pendientes.
- Aislamiento por empresa y auditoría.

## Instalación

1. Respaldar la carpeta actual `src/modules/dumpsters/rentals`.
2. Copiar esta carpeta con el nombre `rentals`.
3. Mantener en `app.js`:

```js
app.use(
  "/api/rentas",
  require("./src/modules/dumpsters/rentals/rentas.routes")
);
```

4. Ejecutar `npm run dev`.
5. Probar el flujo completo antes del commit.

## Nota sobre estados

Se conservaron los valores existentes del controlador original, incluyendo:

- Renta nueva: `programada`.
- Renta cerrada: `finalizado` o `cancelado`.
- Pago inicial: `pending`, `paid`, `partial`.
- Pagos posteriores: `pagado`, `parcial`, `anulado`.

No se unificaron estos valores para evitar romper el frontend o los datos actuales. Esa normalización debe hacerse después mediante una migración controlada.
