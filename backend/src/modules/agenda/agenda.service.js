const pool =
  require("../../shared/database/db");

const repository =
  require("./agenda.repository");

const {
  ESTADOS_CITA,
} = require(
  "./agenda.constants"
);


// ======================================================
// CONFIGURACIÓN AGENDA
// ======================================================

const HORA_INICIO =
  "08:00";

const HORA_FIN =
  "17:00";

const INTERVALO_MINUTOS =
  30;


// ======================================================
// NORMALIZAR TEXTO
// ======================================================

const limpiarTexto = (
  valor
) => {

  if (
    valor === undefined ||
    valor === null
  ) {
    return null;
  }

  const texto =
    String(valor)
      .trim();

  return (
    texto ||
    null
  );
};


// ======================================================
// CONVERTIR A NÚMERO O NULL
// ======================================================

const numeroONull = (
  valor
) => {

  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  const numero =
    Number(valor);

  if (
    Number.isNaN(numero)
  ) {
    return null;
  }

  return numero;
};


// ======================================================
// FORMATEAR FECHA PARA MYSQL
// ======================================================

const formatearFechaMysql = (
  fecha
) => {

  const year =
    fecha.getFullYear();

  const month =
    String(
      fecha.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      fecha.getDate()
    ).padStart(
      2,
      "0"
    );

  const hours =
    String(
      fecha.getHours()
    ).padStart(
      2,
      "0"
    );

  const minutes =
    String(
      fecha.getMinutes()
    ).padStart(
      2,
      "0"
    );

  const seconds =
    String(
      fecha.getSeconds()
    ).padStart(
      2,
      "0"
    );

  return (
    `${year}-${month}-${day} ` +
    `${hours}:${minutes}:${seconds}`
  );
};


// ======================================================
// CREAR FECHA DESDE FECHA + HORA
// ======================================================

const construirFechaHora = (
  fecha,
  hora
) => {

  if (
    !fecha ||
    !hora
  ) {
    return null;
  }

  const fechaISO =
    String(fecha)
      .split("T")[0];

  const horaNormalizada =
    String(hora)
      .trim()
      .slice(
        0,
        5
      );

  const fechaDate =
    new Date(
      `${fechaISO}T${horaNormalizada}:00`
    );

  if (
    Number.isNaN(
      fechaDate.getTime()
    )
  ) {
    return null;
  }

  return fechaDate;
};


// ======================================================
// PARSEAR DATETIME MYSQL / ISO
// ======================================================

const convertirADate = (
  valor
) => {

  if (!valor) {
    return null;
  }

  if (
    valor instanceof Date
  ) {
    return valor;
  }

  const normalizado =
    String(valor)
      .replace(
        " ",
        "T"
      );

  const fecha =
    new Date(
      normalizado
    );

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return null;
  }

  return fecha;
};


// ======================================================
// VALIDAR FECHAS
// ======================================================

const validarRangoFecha =
  (
    fecha_inicio,
    fecha_fin
  ) => {

    const inicio =
      convertirADate(
        fecha_inicio
      );

    const fin =
      convertirADate(
        fecha_fin
      );

    if (
      !inicio ||
      !fin
    ) {
      return {
        ok: false,

        message:
          "La fecha u hora de la cita no es válida",
      };
    }

    if (
      fin <= inicio
    ) {
      return {
        ok: false,

        message:
          "La hora de finalización debe ser posterior a la hora de inicio",
      };
    }

    return {
      ok: true,
    };
  };


// ======================================================
// FORM DATA
// ======================================================

const obtenerFormData =
  async (
    usuario
  ) => {

    const id_empresa =
      Number(
        usuario.id_empresa
      );

    const [
      medios_contacto,

      tipos_cita,

      usuarios,
    ] =
      await Promise.all([

        repository
          .obtenerMediosContacto(
            null,
            id_empresa
          ),

        repository
          .obtenerTiposCita(
            null,
            id_empresa
          ),

        repository
          .obtenerUsuariosEmpresa(
            null,
            id_empresa
          ),
      ]);

    return {
      medios_contacto,

      tipos_cita,

      usuarios,

      configuracion: {
        hora_inicio:
          HORA_INICIO,

        hora_fin:
          HORA_FIN,

        intervalo_minutos:
          INTERVALO_MINUTOS,
      },
    };
  };


// ======================================================
// CREAR CONTACTO + CITA
// ======================================================

const crearCita =
  async (
    usuario,
    body
  ) => {

    const connection =
      await pool
        .getConnection();

    try {

      await connection
        .beginTransaction();


      // ==================================================
      // EMPRESA / USUARIO
      // ==================================================

      const id_empresa =
        Number(
          usuario.id_empresa
        );

      const creado_por =
        Number(
          usuario.id_usuario
        );


      // ==================================================
      // DATOS CLIENTE
      // ==================================================
      //
      // Compatibilidad:
      //
      // Front actual:
      // contacto
      //
      // Backend anterior:
      // nombres
      //
      // ==================================================

      const nombres =
        limpiarTexto(
          body.contacto ??
          body.nombres ??
          body.nombre
        );

      const celular =
        limpiarTexto(
          body.celular
        );

      const correo =
        limpiarTexto(
          body.correo
        );

      const direccion =
        limpiarTexto(
          body.direccion
        );


      // ==================================================
      // MEDIO CONTACTO
      // ==================================================

      const id_medio_contacto =
        numeroONull(
          body.id_medio ??
          body.id_medio_contacto
        );


      // ==================================================
      // TIPO DE TRABAJO
      // ==================================================

      const id_tipo_cita =
        numeroONull(
          body.id_tipo_cita
        );


      // ==================================================
      // RESPONSABLE
      // ==================================================
      //
      // Front actual:
      // id_usuario_asignado
      //
      // Backend anterior:
      // asignado_a
      //
      // ==================================================

      let asignado_a =
        numeroONull(
          body.id_usuario_asignado ??
          body.asignado_a
        );


      // ==================================================
      // FECHA / HORA
      // ==================================================
      //
      // Front actual envía:
      //
      // fecha: 2026-08-26
      // hora: 08:30
      //
      // No usamos "duración del trabajo".
      //
      // El intervalo de 30 minutos sirve SOLAMENTE
      // para reservar un bloque dentro de la agenda.
      //
      // ==================================================

      let fecha_inicio =
        body.fecha_inicio ||
        null;

      let fecha_fin =
        body.fecha_fin ||
        null;


      // ==================================================
      // CONSTRUIR FECHA INICIO
      // ==================================================

      if (
        !fecha_inicio &&
        body.fecha &&
        body.hora
      ) {

        const inicioDate =
          construirFechaHora(
            body.fecha,
            body.hora
          );

        if (
          inicioDate
        ) {
          fecha_inicio =
            formatearFechaMysql(
              inicioDate
            );
        }
      }


      // ==================================================
      // CONSTRUIR FECHA FIN AUTOMÁTICAMENTE
      // ==================================================
      //
      // IMPORTANTE:
      //
      // +30 minutos NO significa que el trabajo dura
      // 30 minutos.
      //
      // Es solamente el bloque mínimo que se reserva
      // dentro del calendario.
      //
      // ==================================================

      if (
        fecha_inicio &&
        !fecha_fin
      ) {

        const inicioDate =
          convertirADate(
            fecha_inicio
          );

        if (
          inicioDate
        ) {

          const finDate =
            new Date(
              inicioDate
            );

          finDate.setMinutes(
            finDate.getMinutes() +
            INTERVALO_MINUTOS
          );

          fecha_fin =
            formatearFechaMysql(
              finDate
            );
        }
      }


      // ==================================================
      // CAMPOS OBLIGATORIOS
      // ==================================================

      if (
        !nombres
      ) {

        const error =
          new Error(
            "El nombre es obligatorio"
          );

        error.status =
          400;

        error.code =
          "AGENDA_NOMBRE_REQUERIDO";

        throw error;
      }


      if (
        !celular
      ) {

        const error =
          new Error(
            "El celular es obligatorio"
          );

        error.status =
          400;

        error.code =
          "AGENDA_CELULAR_REQUERIDO";

        throw error;
      }


      if (
        !id_tipo_cita
      ) {

        const error =
          new Error(
            "Debe seleccionar el tipo de trabajo"
          );

        error.status =
          400;

        error.code =
          "AGENDA_TIPO_REQUERIDO";

        throw error;
      }


      if (
        !fecha_inicio
      ) {

        const error =
          new Error(
            "Debe seleccionar la fecha y hora"
          );

        error.status =
          400;

        error.code =
          "AGENDA_FECHA_REQUERIDA";

        throw error;
      }


      // ==================================================
      // SI NO ENVIARON RESPONSABLE
      // ==================================================
      //
      // Si la empresa tiene una sola persona asignable,
      // se selecciona automáticamente.
      //
      // Si tiene varias, debe seleccionarse desde
      // el frontend.
      //
      // ==================================================

      if (
        !asignado_a
      ) {

        const usuarios =
          await repository
            .obtenerUsuariosEmpresa(
              connection,
              id_empresa
            );

        if (
          usuarios.length === 1
        ) {

          asignado_a =
            Number(
              usuarios[0]
                .id_usuario
            );

        } else {

          const error =
            new Error(
              "Debe seleccionar la persona responsable de la cita"
            );

          error.status =
            400;

          error.code =
            "AGENDA_RESPONSABLE_REQUERIDO";

          throw error;
        }
      }


      // ==================================================
      // VALIDAR FECHA
      // ==================================================

      const rango =
        validarRangoFecha(
          fecha_inicio,
          fecha_fin
        );

      if (
        !rango.ok
      ) {

        const error =
          new Error(
            rango.message
          );

        error.status =
          400;

        error.code =
          "AGENDA_FECHA_INVALIDA";

        throw error;
      }


      // ==================================================
      // VALIDAR TIPO DE TRABAJO
      // ==================================================

      const tipoCita =
        await repository
          .obtenerTipoCita(
            connection,
            {
              id_empresa,

              id_tipo_cita,
            }
          );

      if (
        !tipoCita
      ) {

        const error =
          new Error(
            "El tipo de trabajo no pertenece a esta empresa"
          );

        error.status =
          400;

        error.code =
          "AGENDA_TIPO_INVALIDO";

        throw error;
      }


      // ==================================================
      // VALIDAR RESPONSABLE
      // ==================================================

      const responsable =
        await repository
          .obtenerUsuarioAsignable(
            connection,
            {
              id_empresa,

              id_usuario:
                asignado_a,
            }
          );

      if (
        !responsable
      ) {

        const error =
          new Error(
            "La persona seleccionada no pertenece a esta empresa"
          );

        error.status =
          400;

        error.code =
          "AGENDA_RESPONSABLE_INVALIDO";

        throw error;
      }


      // ==================================================
      // VERIFICAR HORARIO OCUPADO
      // ==================================================
      //
      // El bloqueo es por RESPONSABLE.
      //
      // Eso significa:
      //
      // Hayley puede tener cita 8:30
      // John puede tener cita 8:30
      //
      // Pero Hayley no puede tener DOS citas
      // a las 8:30.
      //
      // ==================================================

      const ocupado =
        await repository
          .existeSolapamiento(
            connection,
            {
              id_empresa,

              asignado_a,

              fecha_inicio,

              fecha_fin,
            }
          );

      if (
        ocupado
      ) {

        const error =
          new Error(
            "El responsable ya tiene una cita en ese horario"
          );

        error.status =
          409;

        error.code =
          "AGENDA_HORARIO_OCUPADO";

        throw error;
      }


      // ==================================================
      // BUSCAR CONTACTO EXISTENTE
      // ==================================================

      let contacto =
        await repository
          .buscarContactoPorCelular(
            connection,
            {
              id_empresa,

              celular,
            }
          );

      let id_contacto;


      // ==================================================
      // CONTACTO EXISTENTE
      // ==================================================

      if (
        contacto
      ) {

        id_contacto =
          contacto.id_contacto;

        await repository
          .actualizarContacto(
            connection,
            {
              id_empresa,

              id_contacto,

              nombres,

              celular,

              correo,

              direccion,

              latitud:
                body.latitud ??
                null,

              longitud:
                body.longitud ??
                null,

              id_medio_contacto,

              notas:
                limpiarTexto(
                  body.notas_contacto
                ),
            }
          );


      // ==================================================
      // CONTACTO NUEVO
      // ==================================================

      } else {

        id_contacto =
          await repository
            .crearContacto(
              connection,
              {
                id_empresa,

                nombres,

                celular,

                correo,

                direccion,

                latitud:
                  body.latitud ??
                  null,

                longitud:
                  body.longitud ??
                  null,

                id_medio_contacto,

                notas:
                  limpiarTexto(
                    body.notas_contacto
                  ),

                creado_por,
              }
            );
      }


      // ==================================================
      // CREAR CITA
      // ==================================================

      const id_cita =
        await repository
          .crearCita(
            connection,
            {
              id_empresa,

              id_contacto,

              id_tipo_cita,

              asignado_a,

              titulo:
                limpiarTexto(
                  body.titulo
                ) ||
                tipoCita.nombre,

              descripcion:
                limpiarTexto(
                  body.descripcion
                ),

              fecha_inicio,

              fecha_fin,

              direccion,

              latitud:
                body.latitud ??
                null,

              longitud:
                body.longitud ??
                null,

              observaciones:
                limpiarTexto(
                  body.observaciones
                ),

              creado_por,
            }
          );


      // ==================================================
      // COMMIT
      // ==================================================

      await connection
        .commit();

      return {
        id_cita,

        id_contacto,

        asignado_a,

        fecha_inicio,

        fecha_fin,
      };


    } catch (
      error
    ) {

      await connection
        .rollback();

      throw error;


    } finally {

      connection
        .release();
    }
  };


// ======================================================
// LISTAR CITAS
// ======================================================

const listarCitas =
  async (
    usuario,
    query
  ) => {

    const id_empresa =
      Number(
        usuario.id_empresa
      );

    const fecha_desde =
      query.fecha_desde;

    const fecha_hasta =
      query.fecha_hasta;

    if (
      !fecha_desde ||
      !fecha_hasta
    ) {

      const error =
        new Error(
          "Debe indicar fecha_desde y fecha_hasta"
        );

      error.status =
        400;

      error.code =
        "AGENDA_RANGO_REQUERIDO";

      throw error;
    }

    return repository
      .listarCitas({
        id_empresa,

        fecha_desde,

        fecha_hasta,

        asignado_a:
          query.asignado_a
            ? Number(
                query.asignado_a
              )
            : null,
      });
  };


// ======================================================
// DETALLE CITA
// ======================================================

const obtenerDetalle =
  async (
    usuario,
    idCita
  ) => {

    const cita =
      await repository
        .obtenerCitaPorId({
          id_empresa:
            Number(
              usuario.id_empresa
            ),

          id_cita:
            Number(
              idCita
            ),
        });

    if (
      !cita
    ) {

      const error =
        new Error(
          "Cita no encontrada"
        );

      error.status =
        404;

      error.code =
        "AGENDA_CITA_NO_ENCONTRADA";

      throw error;
    }

    return cita;
  };




// ======================================================
// REAGENDAR CITA
// ======================================================

const reagendarCita =
  async (
    usuario,
    idCita,
    body
  ) => {

    const connection =
      await pool
        .getConnection();

    try {

      await connection
        .beginTransaction();

      const id_empresa =
        Number(
          usuario?.id_empresa
        );

      const id_cita =
        Number(
          idCita
        );

      if (
        !id_empresa ||
        !id_cita
      ) {

        const error =
          new Error(
            "La cita no es válida"
          );

        error.status = 400;
        error.code =
          "AGENDA_CITA_INVALIDA";

        throw error;
      }

      const cita =
        await repository
          .obtenerCitaPorId({
            id_empresa,
            id_cita,
          });

      if (!cita) {

        const error =
          new Error(
            "Cita no encontrada"
          );

        error.status = 404;
        error.code =
          "AGENDA_CITA_NO_ENCONTRADA";

        throw error;
      }

      const estadoActual =
        String(
          cita.estado || ""
        ).toLowerCase();

      if (
        estadoActual ===
          ESTADOS_CITA.CANCELADA ||
        estadoActual ===
          ESTADOS_CITA.COMPLETADA
      ) {

        const error =
          new Error(
            "No se puede reagendar una cita cancelada o completada"
          );

        error.status = 409;
        error.code =
          "AGENDA_CITA_BLOQUEADA";

        throw error;
      }

      const fecha =
        limpiarTexto(
          body?.fecha
        );

      const hora =
        limpiarTexto(
          body?.hora
        );

      const nuevoInicio =
        construirFechaHora(
          fecha,
          hora
        );

      if (!nuevoInicio) {

        const error =
          new Error(
            "La nueva fecha u hora no es válida"
          );

        error.status = 400;
        error.code =
          "AGENDA_FECHA_INVALIDA";

        throw error;
      }

      if (
        nuevoInicio.getTime() <
        Date.now()
      ) {

        const error =
          new Error(
            "No se puede reagendar una cita en una fecha u hora pasada"
          );

        error.status = 400;
        error.code =
          "AGENDA_FECHA_PASADA";

        throw error;
      }

      const inicioAnterior =
        convertirADate(
          cita.fecha_inicio
        );

      const finAnterior =
        convertirADate(
          cita.fecha_fin
        );

      let duracionMinutos =
        INTERVALO_MINUTOS;

      if (
        inicioAnterior &&
        finAnterior &&
        finAnterior >
          inicioAnterior
      ) {

        duracionMinutos =
          Math.max(
            1,
            Math.round(
              (
                finAnterior.getTime() -
                inicioAnterior.getTime()
              ) /
              60000
            )
          );
      }

      const nuevoFin =
        new Date(
          nuevoInicio.getTime() +
          duracionMinutos *
            60000
        );

      const validacion =
        validarRangoFecha(
          nuevoInicio,
          nuevoFin
        );

      if (
        !validacion.ok
      ) {

        const error =
          new Error(
            validacion.message
          );

        error.status = 400;
        error.code =
          "AGENDA_RANGO_INVALIDO";

        throw error;
      }

      const minutosInicio =
        nuevoInicio.getHours() *
          60 +
        nuevoInicio.getMinutes();

      const minutosFin =
        nuevoFin.getHours() *
          60 +
        nuevoFin.getMinutes();

      const [
        horaInicioAgenda,
        minutoInicioAgenda,
      ] =
        HORA_INICIO
          .split(":")
          .map(Number);

      const [
        horaFinAgenda,
        minutoFinAgenda,
      ] =
        HORA_FIN
          .split(":")
          .map(Number);

      const limiteInicio =
        horaInicioAgenda * 60 +
        minutoInicioAgenda;

      const limiteFin =
        horaFinAgenda * 60 +
        minutoFinAgenda;

      if (
        minutosInicio <
          limiteInicio ||
        minutosFin >
          limiteFin
      ) {

        const error =
          new Error(
            `La cita debe estar dentro del horario ${HORA_INICIO} - ${HORA_FIN}`
          );

        error.status = 400;
        error.code =
          "AGENDA_FUERA_HORARIO";

        throw error;
      }

      const fecha_inicio =
        formatearFechaMysql(
          nuevoInicio
        );

      const fecha_fin =
        formatearFechaMysql(
          nuevoFin
        );

      const ocupado =
        await repository
          .existeSolapamiento(
            connection,
            {
              id_empresa,

              asignado_a:
                Number(
                  cita.asignado_a
                ),

              fecha_inicio,
              fecha_fin,

              excluir_id_cita:
                id_cita,
            }
          );

      if (ocupado) {

        const error =
          new Error(
            "El responsable ya tiene una cita en ese horario"
          );

        error.status = 409;
        error.code =
          "AGENDA_HORARIO_OCUPADO";

        throw error;
      }

      const actualizado =
        await repository
          .actualizarHorarioCita(
            connection,
            {
              id_empresa,
              id_cita,
              fecha_inicio,
              fecha_fin,
            }
          );

      if (!actualizado) {

        const error =
          new Error(
            "No se pudo reagendar la cita"
          );

        error.status = 400;
        error.code =
          "AGENDA_NO_REAGENDADA";

        throw error;
      }

      await connection
        .commit();

      return (
        await repository
          .obtenerCitaPorId({
            id_empresa,
            id_cita,
          })
      );


    } catch (error) {

      await connection
        .rollback();

      throw error;


    } finally {

      connection
        .release();
    }
  };


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstado =
  async (
    usuario,
    idCita,
    estado
  ) => {

    const connection =
      await pool
        .getConnection();

    try {

      await connection
        .beginTransaction();

      const id_empresa =
        Number(
          usuario.id_empresa
        );

      const cita =
        await repository
          .obtenerCitaPorId({
            id_empresa,

            id_cita:
              Number(
                idCita
              ),
          });

      if (
        !cita
      ) {

        const error =
          new Error(
            "Cita no encontrada"
          );

        error.status =
          404;

        error.code =
          "AGENDA_CITA_NO_ENCONTRADA";

        throw error;
      }


      // ==================================================
      // VALIDAR ESTADO
      // ==================================================

      const estadosPermitidos =
        Object.values(
          ESTADOS_CITA
        );

      if (
        !estadosPermitidos.includes(
          estado
        )
      ) {

        const error =
          new Error(
            "Estado de cita no válido"
          );

        error.status =
          400;

        error.code =
          "AGENDA_ESTADO_INVALIDO";

        throw error;
      }


      const actualizado =
        await repository
          .cambiarEstadoCita(
            connection,
            {
              id_empresa,

              id_cita:
                Number(
                  idCita
                ),

              estado,
            }
          );

      if (
        !actualizado
      ) {

        const error =
          new Error(
            "No se pudo actualizar la cita"
          );

        error.status =
          400;

        error.code =
          "AGENDA_NO_ACTUALIZADA";

        throw error;
      }

      await connection
        .commit();

      return true;


    } catch (
      error
    ) {

      await connection
        .rollback();

      throw error;


    } finally {

      connection
        .release();
    }
  };


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  obtenerFormData,

  crearCita,

  listarCitas,

  obtenerDetalle,

  reagendarCita,

  cambiarEstado,
};