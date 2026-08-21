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
    String(valor).trim();

  return texto || null;
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
      new Date(
        fecha_inicio
      );

    const fin =
      new Date(
        fecha_fin
      );


    if (
      Number.isNaN(
        inicio.getTime()
      ) ||
      Number.isNaN(
        fin.getTime()
      )
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
          "08:00",

        hora_fin:
          "17:00",

        intervalo_minutos:
          30,
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
      await pool.getConnection();


    try {

      await connection
        .beginTransaction();


      const id_empresa =
        Number(
          usuario.id_empresa
        );

      const creado_por =
        Number(
          usuario.id_usuario
        );


      const nombres =
        limpiarTexto(
          body.nombres
        );

      const celular =
        limpiarTexto(
          body.celular
        );

      const correo =
        limpiarTexto(
          body.correo
        );


      const id_tipo_cita =
        Number(
          body.id_tipo_cita
        );


      let asignado_a =
        Number(
          body.asignado_a
        );


      const fecha_inicio =
        body.fecha_inicio;

      const fecha_fin =
        body.fecha_fin;


      // ===============================================
      // CAMPOS OBLIGATORIOS
      // ===============================================

      if (!nombres) {

        const error =
          new Error(
            "El nombre es obligatorio"
          );

        error.status = 400;

        throw error;
      }


      if (!celular) {

        const error =
          new Error(
            "El celular es obligatorio"
          );

        error.status = 400;

        throw error;
      }


      if (!id_tipo_cita) {

        const error =
          new Error(
            "Debe seleccionar el tipo de cita"
          );

        error.status = 400;

        throw error;
      }


      // ===============================================
      // SI HAY UN SOLO USUARIO
      // ASIGNAR AUTOMÁTICAMENTE
      // ===============================================

      if (!asignado_a) {

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

          error.status = 400;

          throw error;
        }
      }


      // ===============================================
      // VALIDAR FECHAS
      // ===============================================

      const rango =
        validarRangoFecha(
          fecha_inicio,
          fecha_fin
        );


      if (!rango.ok) {

        const error =
          new Error(
            rango.message
          );

        error.status = 400;

        throw error;
      }


      // ===============================================
      // VALIDAR TIPO CITA
      // ===============================================

      const tipoCita =
        await repository
          .obtenerTipoCita(
            connection,
            {
              id_empresa,
              id_tipo_cita,
            }
          );


      if (!tipoCita) {

        const error =
          new Error(
            "El tipo de cita no pertenece a esta empresa"
          );

        error.status = 400;

        throw error;
      }


      // ===============================================
      // VALIDAR RESPONSABLE
      // ===============================================

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


      if (!responsable) {

        const error =
          new Error(
            "La persona seleccionada no pertenece a esta empresa"
          );

        error.status = 400;

        throw error;
      }


      // ===============================================
      // VERIFICAR HORARIO OCUPADO
      // ===============================================

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


      if (ocupado) {

        const error =
          new Error(
            "El horario seleccionado ya está ocupado"
          );

        error.status = 409;

        error.code =
          "AGENDA_HORARIO_OCUPADO";

        throw error;
      }


      // ===============================================
      // BUSCAR CONTACTO
      // ===============================================

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


      // ===============================================
      // SI EXISTE:
      // ACTUALIZAMOS SUS DATOS
      // ===============================================

      if (contacto) {

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

              direccion:
                limpiarTexto(
                  body.direccion
                ),

              latitud:
                body.latitud,

              longitud:
                body.longitud,

              id_medio_contacto:
                body.id_medio_contacto
                  ? Number(
                      body.id_medio_contacto
                    )
                  : null,

              notas:
                limpiarTexto(
                  body.notas_contacto
                ),
            }
          );

      } else {

        // =============================================
        // CONTACTO NUEVO
        // =============================================

        id_contacto =
          await repository
            .crearContacto(
              connection,
              {
                id_empresa,

                nombres,
                celular,
                correo,

                direccion:
                  limpiarTexto(
                    body.direccion
                  ),

                latitud:
                  body.latitud,

                longitud:
                  body.longitud,

                id_medio_contacto:
                  body.id_medio_contacto
                    ? Number(
                        body.id_medio_contacto
                      )
                    : null,

                notas:
                  limpiarTexto(
                    body.notas_contacto
                  ),

                creado_por,
              }
            );
      }


      // ===============================================
      // CREAR CITA
      // ===============================================

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

              direccion:
                limpiarTexto(
                  body.direccion
                ),

              latitud:
                body.latitud,

              longitud:
                body.longitud,

              observaciones:
                limpiarTexto(
                  body.observaciones
                ),

              creado_por,
            }
          );


      await connection
        .commit();


      return {
        id_cita,
        id_contacto,
      };


    } catch (error) {

      await connection
        .rollback();

      throw error;


    } finally {

      connection.release();
    }
  };


// ======================================================
// LISTAR
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

      error.status = 400;

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
// DETALLE
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


    if (!cita) {

      const error =
        new Error(
          "Cita no encontrada"
        );

      error.status = 404;

      throw error;
    }


    return cita;
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
      await pool.getConnection();


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


      if (!cita) {

        const error =
          new Error(
            "Cita no encontrada"
          );

        error.status = 404;

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


      if (!actualizado) {

        const error =
          new Error(
            "No se pudo actualizar la cita"
          );

        error.status = 400;

        throw error;
      }


      await connection
        .commit();


      return true;


    } catch (error) {

      await connection
        .rollback();

      throw error;


    } finally {

      connection.release();
    }
  };


module.exports = {

  obtenerFormData,

  crearCita,

  listarCitas,

  obtenerDetalle,

  cambiarEstado,
};