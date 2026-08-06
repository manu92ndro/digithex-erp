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

  return texto.slice(
    0,
    maximo
  );
};

// ======================================================
// NORMALIZAR FECHA Y HORA
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

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    throw new RentaError(
      `${nombreCampo} no es válida`,
      400,
      "FECHA_HORA_INVALIDA"
    );
  }

  return fecha;
};

// ======================================================
// FORMATEAR FECHA PARA MYSQL
// ======================================================

const dosDigitos = (valor) =>
  String(valor).padStart(
    2,
    "0"
  );

const formatearFechaMySQL = (
  fecha
) => {
  const parteFecha = [
    fecha.getFullYear(),

    dosDigitos(
      fecha.getMonth() + 1
    ),

    dosDigitos(
      fecha.getDate()
    ),
  ].join("-");

  const parteHora = [
    dosDigitos(
      fecha.getHours()
    ),

    dosDigitos(
      fecha.getMinutes()
    ),

    dosDigitos(
      fecha.getSeconds()
    ),
  ].join(":");

  return `${parteFecha} ${parteHora}`;
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
    (
      1000 *
      60 *
      60
    );

  /*
   * Protección inicial:
   * una sola operación no debería
   * superar 24 horas.
   */
  if (horas > 24) {
    throw new RentaError(
      "El tiempo de la operación no puede superar 24 horas",
      400,
      "TIEMPO_OPERACION_EXCESIVO"
    );
  }

  return redondear(horas);
};

// ======================================================
// VALIDAR DATOS DEL COSTO
// ======================================================

const validarDatosCosto = (
  datos = {}
) => {
  const tipoOperacion = String(
    datos.tipo_operacion || ""
  )
    .trim()
    .toLowerCase();

  const operacionesPermitidas = [
    "entrega",
    "retiro",
  ];

  if (
    !operacionesPermitidas.includes(
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

  /*
   * La disposición solamente corresponde
   * a la operación de retiro.
   */
  if (
    tipoOperacion === "retiro"
  ) {
    costoDisposicion =
      redondear(
        datos.costo_disposicion
      );

    if (
      costoDisposicion < 0
    ) {
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

    horaInicio:
      formatearFechaMySQL(
        inicio
      ),

    horaFin:
      formatearFechaMySQL(
        fin
      ),

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
// GUARDAR COSTO
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
    !Number.isInteger(
      creadoPor
    ) ||
    creadoPor <= 0
  ) {
    throw new RentaError(
      "No se pudo identificar al usuario",
      400,
      "USUARIO_NO_IDENTIFICADO"
    );
  }

  const costoValidado =
    validarDatosCosto(
      datos
    );

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ================================================
        // 1. VALIDAR RENTA
        // ================================================

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

        /*
         * Por ahora solamente bloqueamos
         * las rentas canceladas.
         *
         * Todavía no validamos estrictamente
         * entrega o retiro por estado porque
         * algunas rentas pueden seguir guardadas
         * como "programada" aunque operativamente
         * ya estén en uso.
         */
        if (
          estadoRenta === "cancelado"
        ) {
          throw new RentaError(
            "No se pueden registrar costos en una renta cancelada",
            409,
            "RENTA_CANCELADA"
          );
        }

        // ================================================
        // 2. OBTENER TARIFA POR HORA
        // ================================================

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

        if (
          tarifaHora <= 0
        ) {
          throw new RentaError(
            "Configure el costo operativo por hora de la empresa",
            400,
            "TARIFA_HORA_NO_CONFIGURADA"
          );
        }

        // ================================================
        // 3. CALCULAR COSTOS
        // ================================================

        const costoOperativo =
          redondear(
            costoValidado
              .horasOperacion *
              tarifaHora
          );

        const costoTotal =
          redondear(
            costoOperativo +
              costoValidado
                .costoDisposicion
          );

        // ================================================
        // 4. INSERTAR O ACTUALIZAR
        // ================================================

        const guardado =
          await repository.guardarCosto(
            conn,
            {
              idEmpresa,
              idRenta: id,

              tipoOperacion:
                costoValidado
                  .tipoOperacion,

              horaInicio:
                costoValidado
                  .horaInicio,

              horaFin:
                costoValidado
                  .horaFin,

              horasOperacion:
                costoValidado
                  .horasOperacion,

              tarifaHora,
              costoOperativo,

              lugarDisposicion:
                costoValidado
                  .lugarDisposicion,

              numeroTicket:
                costoValidado
                  .numeroTicket,

              costoDisposicion:
                costoValidado
                  .costoDisposicion,

              costoTotal,

              observaciones:
                costoValidado
                  .observaciones,

              creadoPor,
            }
          );

        /*
         * El repository debe devolver:
         * {
         *   insertId,
         *   affectedRows
         * }
         */
        if (
          !guardado ||
          Number(
            guardado.affectedRows || 0
          ) <= 0
        ) {
          throw new RentaError(
            "No se pudo guardar el costo de la renta",
            500,
            "COSTO_NO_GUARDADO"
          );
        }

        return {
          tipoOperacion:
            costoValidado
              .tipoOperacion,

          horasOperacion:
            costoValidado
              .horasOperacion,

          tarifaHora,
          costoOperativo,

          costoDisposicion:
            costoValidado
              .costoDisposicion,

          costoTotal,
        };
      }
    );

  // ======================================================
  // 5. AUDITORÍA
  // ======================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion:
      "GUARDAR_COSTO_RENTA",

    descripcion:
      `Costo de ${resultado.tipoOperacion} registrado en renta #${id}. ` +
      `Horas: ${resultado.horasOperacion}, ` +
      `operación: $${resultado.costoOperativo.toFixed(2)}, ` +
      `disposición: $${resultado.costoDisposicion.toFixed(2)}, ` +
      `total: $${resultado.costoTotal.toFixed(2)}`,
  });

  return {
    id_renta: id,

    tipo_operacion:
      resultado.tipoOperacion,

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

  /*
   * El impuesto cobrado no se considera
   * ingreso operativo de la empresa.
   */
  const ingresoOperativo =
    redondear(
      Number(
        finanzas.subtotal_base ||
          0
      ) +
        Number(
          finanzas.total_extras ||
            0
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
          ) *
            100
        )
      : 0;

  /*
   * Si todavía no existen costos,
   * buscamos la tarifa directamente
   * desde configuración para que el
   * formulario pueda mostrarla.
   */
  let tarifaHora = costos[0]
    ? redondear(
        costos[0]
          .tarifa_hora
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
          resumen
            ?.costo_entrega
        ),

      costo_retiro:
        redondear(
          resumen
            ?.costo_retiro
        ),

      costo_disposicion:
        redondear(
          resumen
            ?.costo_disposicion
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