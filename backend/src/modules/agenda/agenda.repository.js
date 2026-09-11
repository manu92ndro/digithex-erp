const pool =
  require("../../shared/database/db");


// ======================================================
// MEDIOS DE CONTACTO
// ======================================================

const obtenerMediosContacto =
  async (
    connection,
    id_empresa
  ) => {

    const db =
      connection || pool;

    const [rows] =
      await db.query(
        `
          SELECT
            id_medio,
            nombre

          FROM
            tb_agenda_medios_contacto

          WHERE
            estado = 1
            AND (
              id_empresa IS NULL
              OR id_empresa = ?
            )

          ORDER BY
            nombre ASC
        `,
        [
          id_empresa,
        ]
      );

    return rows;
  };


// ======================================================
// TIPOS DE CITA
// ======================================================

const obtenerTiposCita =
  async (
    connection,
    id_empresa
  ) => {

    const db =
      connection || pool;

    const [rows] =
      await db.query(
        `
          SELECT
            id_tipo_cita,
            nombre,
            descripcion,
            duracion_minutos

          FROM
            tb_agenda_tipos_cita

          WHERE
            id_empresa = ?
            AND estado = 1

          ORDER BY
            nombre ASC
        `,
        [
          id_empresa,
        ]
      );

    return rows;
  };


// ======================================================
// USUARIOS DISPONIBLES PARA AGENDA
//
// IMPORTANTE:
// Se utiliza tb_usuario_empresas.
// No tb_usuarios.id_empresa.
// ======================================================

const obtenerUsuariosEmpresa =
  async (
    connection,
    id_empresa
  ) => {

    const db =
      connection || pool;

    const [rows] =
      await db.query(
        `
          SELECT DISTINCT

            u.id_usuario,

            u.nombres,

            u.email,

            u.celular,

            u.foto,

            ue.id_rol,

            r.rol

          FROM
            tb_usuario_empresas ue

          INNER JOIN
            tb_usuarios u
              ON u.id_usuario =
                 ue.id_usuario

          INNER JOIN
            tb_roles r
              ON r.id_rol =
                 ue.id_rol

          WHERE
            ue.id_empresa = ?

            AND ue.estado = 1

            AND u.estado = 1

            AND r.estado = 1

          ORDER BY
            u.nombres ASC
        `,
        [
          id_empresa,
        ]
      );

    return rows;
  };


// ======================================================
// BUSCAR CONTACTO POR CELULAR
// ======================================================

const buscarContactoPorCelular =
  async (
    connection,
    {
      id_empresa,
      celular,
    }
  ) => {

    const db =
      connection || pool;

    const [rows] =
      await db.query(
        `
          SELECT
            id_contacto,
            id_empresa,
            nombres,
            celular,
            correo,
            direccion,
            latitud,
            longitud,
            id_medio_contacto,
            notas,
            estado

          FROM
            tb_agenda_contactos

          WHERE
            id_empresa = ?
            AND celular = ?
            AND estado = 1

          LIMIT 1
        `,
        [
          id_empresa,
          celular,
        ]
      );

    return rows[0] || null;
  };


// ======================================================
// OBTENER CONTACTO
// ======================================================

const obtenerContactoPorId =
  async (
    connection,
    {
      id_empresa,
      id_contacto,
    }
  ) => {

    const db =
      connection || pool;

    const [rows] =
      await db.query(
        `
          SELECT
            c.id_contacto,
            c.id_empresa,
            c.nombres,
            c.celular,
            c.correo,
            c.direccion,
            c.latitud,
            c.longitud,
            c.id_medio_contacto,
            c.notas,
            c.estado,

            m.nombre
              AS medio_contacto

          FROM
            tb_agenda_contactos c

          LEFT JOIN
            tb_agenda_medios_contacto m
              ON m.id_medio = c.id_medio_contacto
              AND (
                m.id_empresa IS NULL
                OR m.id_empresa = c.id_empresa
              )

          WHERE
            c.id_contacto = ?
            AND c.id_empresa = ?

          LIMIT 1
        `,
        [
          id_contacto,
          id_empresa,
        ]
      );

    return rows[0] || null;
  };


// ======================================================
// CREAR CONTACTO
// ======================================================

const crearContacto =
  async (
    connection,
    {
      id_empresa,

      nombres,
      celular,
      correo,

      direccion,
      latitud,
      longitud,

      id_medio_contacto,

      notas,

      creado_por,
    }
  ) => {

    const [result] =
      await connection.query(
        `
          INSERT INTO
            tb_agenda_contactos
          (
            id_empresa,

            nombres,
            celular,
            correo,

            direccion,
            latitud,
            longitud,

            id_medio_contacto,

            notas,

            estado,

            creado_por,

            fecha_registro
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            1,
            ?,
            NOW()
          )
        `,
        [
          id_empresa,

          nombres,
          celular,
          correo || null,

          direccion || null,

          latitud ?? null,
          longitud ?? null,

          id_medio_contacto || null,

          notas || null,

          creado_por,
        ]
      );

    return result.insertId;
  };


// ======================================================
// ACTUALIZAR CONTACTO
// ======================================================

const actualizarContacto =
  async (
    connection,
    {
      id_empresa,
      id_contacto,

      nombres,
      celular,
      correo,

      direccion,
      latitud,
      longitud,

      id_medio_contacto,

      notas,
    }
  ) => {

    await connection.query(
      `
        UPDATE
          tb_agenda_contactos

        SET
          nombres = ?,
          celular = ?,
          correo = ?,

          direccion = ?,
          latitud = ?,
          longitud = ?,

          id_medio_contacto = ?,

          notas = ?,

          fyh_actualizacion = NOW()

        WHERE
          id_contacto = ?
          AND id_empresa = ?
      `,
      [
        nombres,
        celular,
        correo || null,

        direccion || null,

        latitud ?? null,
        longitud ?? null,

        id_medio_contacto || null,

        notas || null,

        id_contacto,
        id_empresa,
      ]
    );
  };


// ======================================================
// VALIDAR TIPO CITA
// ======================================================

const obtenerTipoCita =
  async (
    connection,
    {
      id_empresa,
      id_tipo_cita,
    }
  ) => {

    const db =
      connection || pool;

    const [rows] =
      await db.query(
        `
          SELECT
            id_tipo_cita,
            nombre,
            descripcion,
            duracion_minutos

          FROM
            tb_agenda_tipos_cita

          WHERE
            id_tipo_cita = ?
            AND id_empresa = ?
            AND estado = 1

          LIMIT 1
        `,
        [
          id_tipo_cita,
          id_empresa,
        ]
      );

    return rows[0] || null;
  };


// ======================================================
// VALIDAR USUARIO ASIGNADO
// ======================================================

const obtenerUsuarioAsignable =
  async (
    connection,
    {
      id_empresa,
      id_usuario,
    }
  ) => {

    const db =
      connection || pool;

    const [rows] =
      await db.query(
        `
          SELECT
            u.id_usuario,
            u.nombres,
            u.email,

            ue.id_rol,

            r.rol

          FROM
            tb_usuario_empresas ue

          INNER JOIN
            tb_usuarios u
              ON u.id_usuario =
                 ue.id_usuario

          INNER JOIN
            tb_roles r
              ON r.id_rol =
                 ue.id_rol

          WHERE
            ue.id_empresa = ?

            AND ue.id_usuario = ?

            AND ue.estado = 1

            AND u.estado = 1

            AND r.estado = 1

          LIMIT 1
        `,
        [
          id_empresa,
          id_usuario,
        ]
      );

    return rows[0] || null;
  };


// ======================================================
// VERIFICAR SOLAPAMIENTO
// ======================================================

const existeSolapamiento =
  async (
    connection,
    {
      id_empresa,

      asignado_a,

      fecha_inicio,
      fecha_fin,

      excluir_id_cita =
        null,
    }
  ) => {

    const params = [
      id_empresa,
      asignado_a,
      fecha_fin,
      fecha_inicio,
    ];

    let excluirSql = "";


    if (excluir_id_cita) {

      excluirSql =
        `
          AND
            id_cita <> ?
        `;

      params.push(
        excluir_id_cita
      );
    }


    const [rows] =
      await connection.query(
        `
          SELECT
            id_cita

          FROM
            tb_agenda_citas

          WHERE
            id_empresa = ?

            AND asignado_a = ?

            AND estado
              IN (
                'programada',
                'confirmada'
              )

            AND fecha_inicio < ?

            AND fecha_fin > ?

            ${excluirSql}

          LIMIT 1
        `,
        params
      );


    return rows.length > 0;
  };


// ======================================================
// CREAR CITA
// ======================================================

const crearCita =
  async (
    connection,
    {
      id_empresa,
      id_contacto,
      id_tipo_cita,

      asignado_a,

      titulo,
      descripcion,

      fecha_inicio,
      fecha_fin,

      direccion,
      latitud,
      longitud,

      observaciones,

      creado_por,
    }
  ) => {

    const [result] =
      await connection.query(
        `
          INSERT INTO
            tb_agenda_citas
          (
            id_empresa,
            id_contacto,
            id_tipo_cita,

            asignado_a,

            titulo,
            descripcion,

            fecha_inicio,
            fecha_fin,

            direccion,
            latitud,
            longitud,

            estado,

            observaciones,

            creado_por,

            fecha_registro
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'programada',
            ?,
            ?,
            NOW()
          )
        `,
        [
          id_empresa,
          id_contacto,
          id_tipo_cita,

          asignado_a,

          titulo || null,
          descripcion || null,

          fecha_inicio,
          fecha_fin,

          direccion || null,

          latitud ?? null,
          longitud ?? null,

          observaciones || null,

          creado_por,
        ]
      );

    return result.insertId;
  };


// ======================================================
// LISTAR CITAS POR RANGO
// ======================================================

const listarCitas =
  async (
    {
      id_empresa,
      fecha_desde,
      fecha_hasta,
      asignado_a =
        null,
    }
  ) => {

    const params = [
      id_empresa,
      fecha_desde,
      fecha_hasta,
    ];

    let filtroUsuario = "";


    if (asignado_a) {

      filtroUsuario =
        `
          AND
            c.asignado_a = ?
        `;

      params.push(
        asignado_a
      );
    }


    const [rows] =
      await pool.query(
        `
          SELECT
            c.id_cita,
            c.id_empresa,

            c.id_contacto,
            contacto.nombres
              AS contacto,

            contacto.celular,
            contacto.correo,
            contacto.id_medio_contacto,

            medio.nombre
              AS medio_contacto,

            c.id_tipo_cita,
            tc.nombre
              AS tipo_cita,

            c.asignado_a,

            usuario.nombres
              AS asignado_nombre,

            usuario.email
              AS asignado_email,

            usuario.celular
              AS asignado_celular,

            c.titulo,
            c.descripcion,

            DATE_FORMAT(
              c.fecha_inicio,
              '%Y-%m-%dT%H:%i:%s'
            ) AS fecha_inicio,

            DATE_FORMAT(
              c.fecha_fin,
              '%Y-%m-%dT%H:%i:%s'
            ) AS fecha_fin,

            c.direccion,
            c.latitud,
            c.longitud,

            c.estado,

            c.observaciones

          FROM
            tb_agenda_citas c

          INNER JOIN
            tb_agenda_contactos contacto
              ON contacto.id_contacto = c.id_contacto
              AND contacto.id_empresa = c.id_empresa

          LEFT JOIN
            tb_agenda_medios_contacto medio
              ON medio.id_medio = contacto.id_medio_contacto
              AND (
                medio.id_empresa IS NULL
                OR medio.id_empresa = c.id_empresa
              )

          INNER JOIN
            tb_agenda_tipos_cita tc
              ON tc.id_tipo_cita =
                 c.id_tipo_cita

          INNER JOIN
            tb_usuarios usuario
              ON usuario.id_usuario =
                 c.asignado_a

          WHERE
            c.id_empresa = ?

            AND c.fecha_inicio >= ?

            AND c.fecha_inicio < ?

            ${filtroUsuario}

          ORDER BY
            c.fecha_inicio ASC
        `,
        params
      );


    return rows;
  };


// ======================================================
// OBTENER DETALLE CITA
// ======================================================

const obtenerCitaPorId =
  async (
    {
      id_empresa,
      id_cita,
    }
  ) => {

    const [rows] =
      await pool.query(
        `
          SELECT

            c.id_cita,
            c.id_empresa,

            c.id_contacto,

            contacto.nombres,
            contacto.celular,
            contacto.correo,

            contacto.id_medio_contacto,

            medio.nombre
              AS medio_contacto,

            c.id_tipo_cita,

            tc.nombre
              AS tipo_cita,

            tc.duracion_minutos,

            c.asignado_a,

            usuario.nombres
              AS asignado_nombre,

            usuario.email
              AS asignado_email,

            usuario.celular
              AS asignado_celular,

            c.titulo,
            c.descripcion,

            DATE_FORMAT(
              c.fecha_inicio,
              '%Y-%m-%dT%H:%i:%s'
            ) AS fecha_inicio,

            DATE_FORMAT(
              c.fecha_fin,
              '%Y-%m-%dT%H:%i:%s'
            ) AS fecha_fin,

            c.direccion,
            c.latitud,
            c.longitud,

            c.estado,

            c.observaciones,

            c.creado_por,

            c.fecha_registro,
            c.fyh_actualizacion

          FROM
            tb_agenda_citas c

          INNER JOIN
            tb_agenda_contactos contacto
              ON contacto.id_contacto = c.id_contacto
              AND contacto.id_empresa = c.id_empresa

          LEFT JOIN
            tb_agenda_medios_contacto medio
              ON medio.id_medio = contacto.id_medio_contacto
              AND (
                medio.id_empresa IS NULL
                OR medio.id_empresa = c.id_empresa
              )

          INNER JOIN
            tb_agenda_tipos_cita tc
              ON tc.id_tipo_cita =
                 c.id_tipo_cita

          INNER JOIN
            tb_usuarios usuario
              ON usuario.id_usuario =
                 c.asignado_a

          WHERE
            c.id_cita = ?

            AND c.id_empresa = ?

          LIMIT 1
        `,
        [
          id_cita,
          id_empresa,
        ]
      );


    return rows[0] || null;
  };




// ======================================================
// REAGENDAR CITA
// ======================================================

const actualizarHorarioCita =
  async (
    connection,
    {
      id_empresa,
      id_cita,
      fecha_inicio,
      fecha_fin,
    }
  ) => {

    const [result] =
      await connection.query(
        `
          UPDATE
            tb_agenda_citas

          SET
            fecha_inicio = ?,
            fecha_fin = ?,
            fyh_actualizacion = NOW()

          WHERE
            id_cita = ?
            AND id_empresa = ?
        `,
        [
          fecha_inicio,
          fecha_fin,
          id_cita,
          id_empresa,
        ]
      );

    return (
      result.affectedRows > 0
    );
  };


// ======================================================
// ACTUALIZAR CITA
// ======================================================

const actualizarCita =
  async (
    connection,
    {
      id_empresa,
      id_cita,

      id_tipo_cita,

      asignado_a,

      titulo,
      descripcion,

      fecha_inicio,
      fecha_fin,

      direccion,
      latitud,
      longitud,

      observaciones,
    }
  ) => {

    await connection.query(
      `
        UPDATE
          tb_agenda_citas

        SET
          id_tipo_cita = ?,

          asignado_a = ?,

          titulo = ?,
          descripcion = ?,

          fecha_inicio = ?,
          fecha_fin = ?,

          direccion = ?,
          latitud = ?,
          longitud = ?,

          observaciones = ?,

          fyh_actualizacion =
            NOW()

        WHERE
          id_cita = ?
          AND id_empresa = ?
      `,
      [
        id_tipo_cita,

        asignado_a,

        titulo || null,
        descripcion || null,

        fecha_inicio,
        fecha_fin,

        direccion || null,
        latitud ?? null,
        longitud ?? null,

        observaciones || null,

        id_cita,
        id_empresa,
      ]
    );
  };


// ======================================================
// CONFIGURACION EMAIL DE LA EMPRESA
// ======================================================

const obtenerConfiguracionEmailEmpresa = async (connectionOrEmpresa, idEmpresaArgumento = null) => {
  let db = pool;
  let idEmpresa = idEmpresaArgumento;

  if (connectionOrEmpresa && typeof connectionOrEmpresa.query === "function") {
    db = connectionOrEmpresa;
  } else if (connectionOrEmpresa && typeof connectionOrEmpresa === "object") {
    idEmpresa = connectionOrEmpresa.id_empresa ?? connectionOrEmpresa.idEmpresa ?? idEmpresaArgumento;
  } else if (connectionOrEmpresa !== undefined && connectionOrEmpresa !== null) {
    idEmpresa = connectionOrEmpresa;
  }

  const empresa = Number(idEmpresa);
  if (!Number.isInteger(empresa) || empresa <= 0) return null;

  const [rows] = await db.query(
    `
      SELECT
        e.id_empresa,
        e.nombre_empresa,
        e.email AS email_empresa,
        e.telefono,
        e.telefono_secundario,
        e.website,
        e.direccion,
        e.logo,
        e.logo_public_id,

        ec.color_primario,
        ec.color_secundario,
        ec.idioma_default,
        ec.email_notificaciones,
        ec.smtp_host,
        ec.smtp_port,
        ec.smtp_secure,
        ec.smtp_user,
        ec.smtp_password,
        ec.smtp_from_name,
        ec.smtp_reply_to

      FROM tb_empresas e

      LEFT JOIN tb_empresa_configuracion ec
        ON ec.id_empresa = e.id_empresa

      WHERE e.id_empresa = ?
        AND e.estado = 1

      LIMIT 1
    `,
    [empresa]
  );

  return rows[0] || null;
};


// ======================================================
// CAMBIAR ESTADO
// ======================================================

const cambiarEstadoCita =
  async (
    connection,
    {
      id_empresa, id_cita, estado,
    }
  ) => {

    const [result] =
      await connection.query(
        `
          UPDATE
            tb_agenda_citas

          SET
            estado = ?,

            fyh_actualizacion =
              NOW()

          WHERE
            id_cita = ?
            AND id_empresa = ?
        `,
        [
          estado,
          id_cita,
          id_empresa,
        ]
      );


    return (
      result.affectedRows > 0
    );
  };


module.exports = {

  obtenerMediosContacto,

  obtenerTiposCita,

  obtenerUsuariosEmpresa,

  buscarContactoPorCelular,

  obtenerContactoPorId,

  crearContacto,

  actualizarContacto,

  obtenerTipoCita,

  obtenerUsuarioAsignable,

  existeSolapamiento,

  crearCita,

  listarCitas,

  obtenerCitaPorId,

  actualizarHorarioCita,

  actualizarCita,

  obtenerConfiguracionEmailEmpresa,

  cambiarEstadoCita,
};