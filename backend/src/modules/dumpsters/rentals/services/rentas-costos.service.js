const db = require(
  "../../../../shared/database/db"
);

const repository = require(
  "../repositories/rentas-costos.repository"
);

const {
  registrarLog,
} = require(
  "../../../../shared/logging/logs"
);

const {
  RentaError,
  obtenerIdEmpresa,
  validarId,
  ejecutarTransaccion,
} = require(
  "../utils/rentas.utils"
);

// ======================================================
// UTILIDADES
// ======================================================

const redondear = (valor) =>
  Number(
    Number(valor || 0).toFixed(2)
  );

const normalizarTexto = (
  valor,
  maximo = 500
) => {
  const texto = String(
    valor || ""
  ).trim();

  if (!texto) {
    return null;
  }

  return texto.slice(0, maximo);
};

const dosDigitos = (valor) =>
  String(valor).padStart(2, "0");

// ======================================================
// FECHAS
// ======================================================

const convertirFecha = (
  valor,
  nombreCampo
) => {
  if (!valor) {
    throw new RentaError(
      `${nombreCampo} es obligatoria`,
      400,
      "FECHA_HORA_REQUERIDA"
    );
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    throw new RentaError(
      `${nombreCampo} no es válida`,
      400,
      "FECHA_HORA_INVALIDA"
    );
  }

  return fecha;
};

const formatearFechaMySQL = (
  fecha
) => {
  const parteFecha = [
    fecha.getFullYear(),
    dosDigitos(fecha.getMonth() + 1),
    dosDigitos(fecha.getDate()),
  ].join("-");

  const parteHora = [
    dosDigitos(fecha.getHours()),
    dosDigitos(fecha.getMinutes()),
    dosDigitos(fecha.getSeconds()),
  ].join(":");

  return `${parteFecha} ${parteHora}`;
};

const formatearSoloFechaMySQL = (
  fecha
) => [
  fecha.getFullYear(),
  dosDigitos(fecha.getMonth() + 1),
  dosDigitos(fecha.getDate()),
].join("-");

const agregarDias = (
  fechaBase,
  dias
) => {
  const fecha = new Date(fechaBase);

  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(
    fecha.getDate() + Number(dias || 0)
  );

  return fecha;
};

// ======================================================
// CALCULAR HORAS
// ======================================================

const calcularHorasOperacion = (
  horaInicio,
  horaFin
) => {
  const diferenciaMs =
    horaFin.getTime() -
    horaInicio.getTime();

  if (diferenciaMs <= 0) {
    throw new RentaError(
      "La hora final debe ser posterior a la hora inicial",
      400,
      "RANGO_HORARIO_INVALIDO"
    );
  }

  const horas =
    diferenciaMs /
    (1000 * 60 * 60);

  /*
   * 5 horas es el tiempo operativo habitual.
   * NO lo usamos como bloqueo porque puede haber
   * tráfico, distancia, espera en disposición, etc.
   *
   * 12 horas sí se considera un dato probablemente
   * incorrecto y se bloquea.
   */
  if (horas > 12) {
    throw new RentaError(
      "El tiempo de la operación no puede superar 12 horas",
      400,
      "TIEMPO_OPERACION_EXCESIVO"
    );
  }

  return redondear(horas);
};

// ======================================================
// VALIDAR DATOS
// ======================================================

const validarDatosCosto = (
  datos = {}
) => {
  const tipoOperacion = String(
    datos.tipo_operacion || ""
  )
    .trim()
    .toLowerCase();

  if (
    !["entrega", "retiro"].includes(
      tipoOperacion
    )
  ) {
    throw new RentaError(
      "El tipo de operación debe ser entrega o retiro",
      400,
      "TIPO_OPERACION_INVALIDO"
    );
  }

  const inicio = convertirFecha(
    datos.hora_inicio,
    "La hora de inicio"
  );

  const fin = convertirFecha(
    datos.hora_fin,
    "La hora final"
  );

  const horasOperacion =
    calcularHorasOperacion(
      inicio,
      fin
    );

  let costoDisposicion = 0;
  let lugarDisposicion = null;
  let numeroTicket = null;

  if (tipoOperacion === "retiro") {
    costoDisposicion =
      redondear(
        datos.costo_disposicion
      );

    if (costoDisposicion < 0) {
      throw new RentaError(
        "El costo de disposición no puede ser negativo",
        400,
        "COSTO_DISPOSICION_INVALIDO"
      );
    }

    lugarDisposicion =
      normalizarTexto(
        datos.lugar_disposicion,
        150
      );

    numeroTicket =
      normalizarTexto(
        datos.numero_ticket,
        100
      );
  }

  return {
    tipoOperacion,

    inicioDate: inicio,
    finDate: fin,

    horaInicio:
      formatearFechaMySQL(inicio),

    horaFin:
      formatearFechaMySQL(fin),

    horasOperacion,

    lugarDisposicion,
    numeroTicket,
    costoDisposicion,

    observaciones:
      normalizarTexto(
        datos.observaciones,
        500
      ),
  };
};

// ======================================================
// REGISTRAR ENTREGA O RETIRO
//
// ENTREGA:
// programada -> en_uso
// y recalcula retiro desde la entrega REAL.
//
// RETIRO:
// en_uso -> finalizado
// guarda fecha real y libera dumpster.
// ======================================================

const guardarCosto = async ({
  idRenta,
  datos,
  usuario,
  req,
}) => {
  const id = validarId(
    idRenta,
    "ID de la renta"
  );

  const idEmpresa =
    obtenerIdEmpresa({
      usuario,
      body: datos,
    });

  const creadoPor = Number(
    usuario?.id_usuario
  );

  if (
    !Number.isInteger(creadoPor) ||
    creadoPor <= 0
  ) {
    throw new RentaError(
      "No se pudo identificar al usuario",
      400,
      "USUARIO_NO_IDENTIFICADO"
    );
  }

  const operacion =
    validarDatosCosto(datos);

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ==============================================
        // 1. BLOQUEAR RENTA
        // ==============================================

        const renta =
          await repository.bloquearRenta(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          );

        if (!renta) {
          throw new RentaError(
            "Renta no encontrada",
            404,
            "RENTA_NO_ENCONTRADA"
          );
        }

        const estadoRenta = String(
          renta.estado || ""
        )
          .trim()
          .toLowerCase();

        // ==============================================
        // 2. VALIDAR TRANSICIÓN
        // ==============================================

        if (
          estadoRenta === "cancelado"
        ) {
          throw new RentaError(
            "No se pueden registrar operaciones en una renta cancelada",
            409,
            "RENTA_CANCELADA"
          );
        }

        if (
          estadoRenta === "finalizado"
        ) {
          throw new RentaError(
            "La renta ya está finalizada",
            409,
            "RENTA_FINALIZADA"
          );
        }

        if (
          operacion.tipoOperacion ===
            "entrega" &&
          estadoRenta !== "programada"
        ) {
          throw new RentaError(
            "La entrega solo puede registrarse cuando la renta está programada",
            409,
            "ESTADO_INVALIDO_PARA_ENTREGA"
          );
        }

        if (
          operacion.tipoOperacion ===
            "retiro" &&
          estadoRenta !== "en_uso"
        ) {
          throw new RentaError(
            "El retiro solo puede registrarse cuando la renta está en uso",
            409,
            "ESTADO_INVALIDO_PARA_RETIRO"
          );
        }

        // ==============================================
        // 3. TARIFA POR HORA
        // ==============================================

        const configuracion =
          await repository.obtenerTarifaHora(
            conn,
            {
              idEmpresa,
            }
          );

        const tarifaHora =
          redondear(
            configuracion
              ?.costo_operativo_hora
          );

        if (tarifaHora <= 0) {
          throw new RentaError(
            "Configure el costo operativo por hora de la empresa",
            400,
            "TARIFA_HORA_NO_CONFIGURADA"
          );
        }

        // ==============================================
        // 4. CALCULAR COSTO
        // ==============================================

        const costoOperativo =
          redondear(
            operacion.horasOperacion *
              tarifaHora
          );

        const costoTotal =
          redondear(
            costoOperativo +
              operacion.costoDisposicion
          );

        // ==============================================
        // 5. GUARDAR OPERACIÓN
        // ==============================================

        let guardado;

        try {
          guardado =
            await repository.guardarCosto(
              conn,
              {
                idEmpresa,
                idRenta: id,

                tipoOperacion:
                  operacion.tipoOperacion,

                horaInicio:
                  operacion.horaInicio,

                horaFin:
                  operacion.horaFin,

                horasOperacion:
                  operacion.horasOperacion,

                tarifaHora,
                costoOperativo,

                lugarDisposicion:
                  operacion
                    .lugarDisposicion,

                numeroTicket:
                  operacion.numeroTicket,

                costoDisposicion:
                  operacion
                    .costoDisposicion,

                costoTotal,

                observaciones:
                  operacion.observaciones,

                creadoPor,
              }
            );
        } catch (error) {
          if (
            error.code === "ER_DUP_ENTRY"
          ) {
            throw new RentaError(
              `La ${operacion.tipoOperacion} ya fue registrada para esta renta`,
              409,
              "OPERACION_YA_REGISTRADA"
            );
          }

          throw error;
        }

        if (
          !guardado ||
          Number(
            guardado.affectedRows || 0
          ) !== 1
        ) {
          throw new RentaError(
            "No se pudo registrar la operación",
            500,
            "OPERACION_NO_GUARDADA"
          );
        }

        // ==============================================
        // 6. ENTREGA: programada -> en_uso
        // ==============================================

        let estadoNuevo =
          estadoRenta;

        let fechaEstimadaDevolucion =
          renta.fecha_estimada_devolucion;

        let fechaRealDevolucion =
          renta.fecha_real_devolucion;

        if (
          operacion.tipoOperacion ===
          "entrega"
        ) {
          const diasRenta =
            Number(renta.dias_renta || 0);

          if (
            !Number.isInteger(diasRenta) ||
            diasRenta <= 0
          ) {
            throw new RentaError(
              "La renta no tiene una duración válida",
              400,
              "DIAS_RENTA_INVALIDOS"
            );
          }

          /*
           * El alquiler comienza cuando TERMINA
           * la entrega real.
           */
          const nuevaFechaRetiro =
            agregarDias(
              operacion.finDate,
              diasRenta
            );

          fechaEstimadaDevolucion =
            formatearSoloFechaMySQL(
              nuevaFechaRetiro
            );

          const actualizada =
            await repository
              .registrarEntregaEnRenta(
                conn,
                {
                  idRenta: id,
                  idEmpresa,
                  fechaEstimadaDevolucion,
                }
              );

          if (actualizada !== 1) {
            throw new RentaError(
              "No se pudo cambiar la renta a en uso",
              409,
              "RENTA_NO_ACTUALIZADA_TRAS_ENTREGA"
            );
          }

          estadoNuevo = "en_uso";
        }

        // ==============================================
        // 7. RETIRO: en_uso -> finalizado
        // ==============================================

        if (
          operacion.tipoOperacion ===
          "retiro"
        ) {
          fechaRealDevolucion =
            formatearSoloFechaMySQL(
              operacion.finDate
            );

          const actualizada =
            await repository
              .registrarRetiroEnRenta(
                conn,
                {
                  idRenta: id,
                  idEmpresa,
                  fechaRealDevolucion,
                }
              );

          if (actualizada !== 1) {
            throw new RentaError(
              "No se pudo finalizar la renta después del retiro",
              409,
              "RENTA_NO_FINALIZADA_TRAS_RETIRO"
            );
          }

          const liberado =
            await repository
              .liberarDumpster(
                conn,
                {
                  idDumpster:
                    renta.id_dumpster,
                  idEmpresa,
                }
              );

          if (liberado !== 1) {
            throw new RentaError(
              "No se pudo liberar el dumpster",
              500,
              "DUMPSTER_NO_LIBERADO"
            );
          }

          estadoNuevo = "finalizado";
        }

        return {
          idCosto:
            Number(
              guardado.insertId || 0
            ),

          tipoOperacion:
            operacion.tipoOperacion,

          estadoAnterior:
            estadoRenta,

          estadoNuevo,

          horaInicio:
            operacion.horaInicio,

          horaFin:
            operacion.horaFin,

          horasOperacion:
            operacion.horasOperacion,

          tarifaHora,
          costoOperativo,

          costoDisposicion:
            operacion.costoDisposicion,

          costoTotal,

          fechaEstimadaDevolucion,
          fechaRealDevolucion,

          advertenciaTiempo:
            operacion.horasOperacion > 5,
        };
      }
    );

  // ====================================================
  // AUDITORÍA
  // ====================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion:
      resultado.tipoOperacion ===
      "entrega"
        ? "REGISTRAR_ENTREGA"
        : "REGISTRAR_RETIRO",

    descripcion:
      `${resultado.tipoOperacion === "entrega" ? "Entrega" : "Retiro"} registrado en renta #${id}. ` +
      `Estado: ${resultado.estadoAnterior} -> ${resultado.estadoNuevo}. ` +
      `Tiempo: ${resultado.horasOperacion} h. ` +
      `Costo operativo: $${resultado.costoOperativo.toFixed(2)}. ` +
      `Disposición: $${resultado.costoDisposicion.toFixed(2)}.`,
  });

  return {
    id_renta: id,
    id_costo:
      resultado.idCosto,

    tipo_operacion:
      resultado.tipoOperacion,

    estado:
      resultado.estadoNuevo,

    hora_inicio:
      resultado.horaInicio,

    hora_fin:
      resultado.horaFin,

    horas_operacion:
      resultado.horasOperacion,

    tarifa_hora:
      resultado.tarifaHora,

    costo_operativo:
      resultado.costoOperativo,

    costo_disposicion:
      resultado.costoDisposicion,

    costo_total:
      resultado.costoTotal,

    fecha_estimada_devolucion:
      resultado.fechaEstimadaDevolucion,

    fecha_real_devolucion:
      resultado.fechaRealDevolucion,

    advertencia_tiempo:
      resultado.advertenciaTiempo,
  };
};

// ======================================================
// OBTENER COSTOS
// ======================================================

const obtenerCostos = async ({
  idRenta,
  usuario,
  query = {},
}) => {
  const id = validarId(
    idRenta,
    "ID de la renta"
  );

  const idEmpresa =
    obtenerIdEmpresa({
      usuario,
      query,
    });

  const [
    costos,
    resumen,
    finanzas,
  ] = await Promise.all([
    repository.obtenerCostos(
      db,
      {
        idRenta: id,
        idEmpresa,
      }
    ),

    repository.obtenerResumenCostos(
      db,
      {
        idRenta: id,
        idEmpresa,
      }
    ),

    repository.obtenerFinanzas(
      db,
      {
        idRenta: id,
        idEmpresa,
      }
    ),
  ]);

  if (!finanzas) {
    throw new RentaError(
      "Finanzas de la renta no encontradas",
      404,
      "FINANZAS_NO_ENCONTRADAS"
    );
  }

  const ingresoOperativo =
    redondear(
      Number(
        finanzas.subtotal_base || 0
      ) +
        Number(
          finanzas.total_extras || 0
        )
    );

  const costoTotal =
    redondear(
      resumen?.costo_total
    );

  const utilidadEstimada =
    redondear(
      ingresoOperativo -
        costoTotal
    );

  const margenEstimado =
    ingresoOperativo > 0
      ? redondear(
          (
            utilidadEstimada /
            ingresoOperativo
          ) * 100
        )
      : 0;

  let tarifaHora = costos[0]
    ? redondear(
        costos[0].tarifa_hora
      )
    : 0;

  if (tarifaHora <= 0) {
    const configuracion =
      await repository.obtenerTarifaHora(
        db,
        {
          idEmpresa,
        }
      );

    tarifaHora =
      redondear(
        configuracion
          ?.costo_operativo_hora
      );
  }

  return {
    id_renta: id,

    tarifa_hora:
      tarifaHora,

    costos:
      Array.isArray(costos)
        ? costos
        : [],

    resumen: {
      costo_entrega:
        redondear(
          resumen?.costo_entrega
        ),

      costo_retiro:
        redondear(
          resumen?.costo_retiro
        ),

      costo_disposicion:
        redondear(
          resumen?.costo_disposicion
        ),

      costo_operativo_total:
        redondear(
          resumen
            ?.costo_operativo_total
        ),

      costo_total:
        costoTotal,

      ingreso_operativo:
        ingresoOperativo,

      utilidad_estimada:
        utilidadEstimada,

      margen_estimado:
        margenEstimado,
    },
  };
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  guardarCosto,
  obtenerCostos,
};
