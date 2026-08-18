const pool = require("../shared/database/db");
const bcrypt = require("bcryptjs");

const {
  registrarLog,
} = require("../shared/logging/logs");

const {
  subirImagen,
  eliminarImagen,
} = require(
  "../shared/cloudinary/cloudinary.service"
);


// ======================================================
// HELPERS
// ======================================================

const esRolAdmin = (rol = "") => {
  const valor = String(rol)
    .trim()
    .toUpperCase();

  return (
    valor === "ADMINISTRADOR" ||
    valor === "ADMIN"
  );
};


const esRolSuperAdmin = (rol = "") => {
  return (
    String(rol)
      .trim()
      .toUpperCase() ===
    "SUPER ADMIN"
  );
};


const normalizarEstado = (
  valor,
  fallback = 1
) => {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return fallback;
  }

  return Number(valor) === 1
    ? 1
    : 0;
};


// ======================================================
// NORMALIZAR EMPRESAS DEL FORMULARIO
// ======================================================

const normalizarAsignaciones = (
  empresas = []
) => {
  if (!Array.isArray(empresas)) {
    return [];
  }

  return empresas
    .map((item) => ({
      id_empresa:
        Number(
          item?.id_empresa
        ),

      id_rol:
        Number(
          item?.id_rol
        ),

      es_principal:
        Number(
          item?.es_principal
        ) === 1
          ? 1
          : 0,

      estado:
        normalizarEstado(
          item?.estado,
          1
        ),
    }))
    .filter(
      (item) =>
        Number.isInteger(
          item.id_empresa
        ) &&
        item.id_empresa > 0 &&
        Number.isInteger(
          item.id_rol
        ) &&
        item.id_rol > 0
    );
};


// ======================================================
// VALIDAR EMPRESAS DUPLICADAS
// ======================================================

const validarAsignacionesDuplicadas = (
  asignaciones
) => {
  const empresas =
    new Set();

  for (
    const asignacion
    of asignaciones
  ) {
    if (
      empresas.has(
        asignacion.id_empresa
      )
    ) {
      return {
        ok: false,

        message:
          "No se puede asignar la misma empresa más de una vez",
      };
    }

    empresas.add(
      asignacion.id_empresa
    );
  }

  return {
    ok: true,
  };
};


// ======================================================
// ASEGURAR UNA EMPRESA PRINCIPAL
// ======================================================

const asegurarEmpresaPrincipal = (
  asignaciones
) => {
  if (
    !Array.isArray(
      asignaciones
    ) ||
    asignaciones.length === 0
  ) {
    return [];
  }

  const activas =
    asignaciones.filter(
      (item) =>
        Number(
          item.estado
        ) === 1
    );

  if (
    activas.length === 0
  ) {
    return asignaciones.map(
      (item) => ({
        ...item,
        es_principal: 0,
      })
    );
  }

  let principalEncontrada =
    false;

  let resultado =
    asignaciones.map(
      (item) => {
        if (
          Number(
            item.estado
          ) !== 1
        ) {
          return {
            ...item,
            es_principal: 0,
          };
        }

        if (
          Number(
            item.es_principal
          ) === 1 &&
          !principalEncontrada
        ) {
          principalEncontrada =
            true;

          return {
            ...item,
            es_principal: 1,
          };
        }

        return {
          ...item,
          es_principal: 0,
        };
      }
    );

  const yaTienePrincipal =
    resultado.some(
      (item) =>
        Number(
          item.es_principal
        ) === 1
    );

  if (
    !yaTienePrincipal
  ) {
    const index =
      resultado.findIndex(
        (item) =>
          Number(
            item.estado
          ) === 1
      );

    if (
      index >= 0
    ) {
      resultado[index] = {
        ...resultado[index],
        es_principal: 1,
      };
    }
  }

  return resultado;
};


// ======================================================
// OBTENER EMPRESAS ASIGNADAS A UN USUARIO
// ======================================================

const obtenerAsignacionesUsuario =
  async (
    executor,
    id_usuario,
    {
      soloActivas = false,
      id_empresa = null,
    } = {}
  ) => {

    const condiciones = [
      "ue.id_usuario = ?",
    ];

    const params = [
      Number(id_usuario),
    ];


    if (soloActivas) {
      condiciones.push(
        "ue.estado = 1"
      );
    }


    if (id_empresa) {
      condiciones.push(
        "ue.id_empresa = ?"
      );

      params.push(
        Number(id_empresa)
      );
    }


    const [rows] =
      await executor.query(
        `
          SELECT
            ue.id_usuario_empresa,
            ue.id_usuario,

            ue.id_empresa,
            e.nombre_empresa,

            e.logo,
            e.logo_public_id,

            ue.id_rol,
            r.rol,

            CAST(
              ue.es_principal
              AS UNSIGNED
            ) AS es_principal,

            CAST(
              ue.estado
              AS UNSIGNED
            ) AS estado,

            CAST(
              e.estado
              AS UNSIGNED
            ) AS estado_empresa,

            CAST(
              r.estado
              AS UNSIGNED
            ) AS estado_rol,

            ue.fecha_asignacion,
            ue.fyh_actualizacion

          FROM tb_usuario_empresas ue

          INNER JOIN tb_empresas e
            ON e.id_empresa =
              ue.id_empresa

          INNER JOIN tb_roles r
            ON r.id_rol =
              ue.id_rol

          WHERE
            ${condiciones.join(
              " AND "
            )}

          ORDER BY
            ue.es_principal DESC,
            e.nombre_empresa ASC
        `,
        params
      );


    return rows;
  };


// ======================================================
// VALIDAR EMPRESA + ROL
// ======================================================

const validarAsignacionesContraBD =
  async ({
    executor,
    asignaciones,
    req,
  }) => {

    const superAdmin =
      esRolSuperAdmin(
        req.usuario?.rol
      );


    for (
      const asignacion
      of asignaciones
    ) {

      // Un administrador normal
      // solo administra su empresa.
      if (
        !superAdmin &&
        Number(
          asignacion.id_empresa
        ) !==
          Number(
            req.usuario.id_empresa
          )
      ) {
        return {
          ok: false,
          status: 403,

          message:
            "No tiene permiso para asignar usuarios a otra empresa",
        };
      }


      const [rows] =
        await executor.query(
          `
            SELECT
              e.id_empresa,

              CAST(
                e.estado
                AS UNSIGNED
              ) AS estado_empresa,

              r.id_rol,
              r.rol,

              CAST(
                r.estado
                AS UNSIGNED
              ) AS estado_rol,

              r.id_empresa
                AS id_empresa_rol

            FROM tb_empresas e

            INNER JOIN tb_roles r
              ON r.id_empresa =
                e.id_empresa

            WHERE
              e.id_empresa = ?
              AND r.id_rol = ?

            LIMIT 1
          `,
          [
            asignacion.id_empresa,
            asignacion.id_rol,
          ]
        );


      if (
        rows.length === 0
      ) {
        return {
          ok: false,
          status: 400,

          message:
            "El rol seleccionado no pertenece a la empresa indicada",
        };
      }


      const relacion = rows[0];


      if (
        Number(
          relacion.estado_empresa
        ) !== 1
      ) {
        return {
          ok: false,
          status: 400,

          message:
            "La empresa seleccionada está inactiva",
        };
      }


      if (
        Number(
          relacion.estado_rol
        ) !== 1
      ) {
        return {
          ok: false,
          status: 400,

          message:
            "El rol seleccionado está inactivo",
        };

      }
      // ======================================================
      // SOLO SUPER ADMIN PUEDE ASIGNAR SUPER ADMIN
      // ======================================================

      if (
        esRolSuperAdmin(
          relacion.rol
        ) &&
        !esRolSuperAdmin(
          req.usuario.rol
        )
      ) {
        return {
          ok: false,
          status: 403,

          message:
            "Solo un SUPER ADMIN puede asignar el rol SUPER ADMIN",
        };
      }

    }


    return {
      ok: true,
    };
  };


// ======================================================
// SINCRONIZAR EMPRESAS DEL USUARIO
//
// IMPORTANTE:
// No borramos físicamente asignaciones.
// Las que se quitan pasan a estado = 0.
// ======================================================

const sincronizarAsignacionesUsuario =
  async ({
    connection,
    id_usuario,
    asignaciones,
    creado_por,

    conservarEmpresasNoAdministrables =
      false,

    id_empresa_actual =
      null,
  }) => {

    const nuevas =
      asegurarEmpresaPrincipal(
        normalizarAsignaciones(
          asignaciones
        )
      );


    // ==================================================
    // SUPER ADMIN
    // Puede administrar todas las empresas.
    // ==================================================

    if (
      !conservarEmpresasNoAdministrables
    ) {

      const idsNuevas =
        nuevas.map(
          (item) =>
            Number(
              item.id_empresa
            )
        );


      // Primero desactivamos las asignaciones
      // que ya no vienen desde el formulario.

      if (
        idsNuevas.length > 0
      ) {

        const placeholders =
          idsNuevas
            .map(() => "?")
            .join(",");


        await connection.query(
          `
            UPDATE tb_usuario_empresas

            SET
              estado = 0,
              es_principal = 0,
              fyh_actualizacion = NOW()

            WHERE
              id_usuario = ?

              AND id_empresa
              NOT IN (
                ${placeholders}
              )
          `,
          [
            id_usuario,
            ...idsNuevas,
          ]
        );

      } else {

        await connection.query(
          `
            UPDATE tb_usuario_empresas

            SET
              estado = 0,
              es_principal = 0,
              fyh_actualizacion = NOW()

            WHERE
              id_usuario = ?
          `,
          [
            id_usuario,
          ]
        );
      }

    } else {

      // ==================================================
      // ADMINISTRADOR NORMAL
      // Solo toca la empresa activa.
      // ==================================================

      const asignacionActual =
        nuevas.find(
          (item) =>
            Number(
              item.id_empresa
            ) ===
            Number(
              id_empresa_actual
            )
        );


      if (!asignacionActual) {

        await connection.query(
          `
            UPDATE tb_usuario_empresas

            SET
              estado = 0,
              es_principal = 0,
              fyh_actualizacion = NOW()

            WHERE
              id_usuario = ?
              AND id_empresa = ?
          `,
          [
            id_usuario,
            id_empresa_actual,
          ]
        );
      }
    }


    // ==================================================
    // INSERTAR / REACTIVAR / ACTUALIZAR
    // ==================================================

    for (
      const asignacion
      of nuevas
    ) {

      await connection.query(
        `
          INSERT INTO tb_usuario_empresas
          (
            id_usuario,
            id_empresa,
            id_rol,
            es_principal,
            estado,
            creado_por,
            fecha_asignacion,
            fyh_actualizacion
          )
          VALUES
          (
            ?, ?, ?, ?, ?, ?,
            NOW(),
            NOW()
          )

          ON DUPLICATE KEY UPDATE

            id_rol =
              VALUES(id_rol),

            es_principal =
              VALUES(es_principal),

            estado =
              VALUES(estado),

            fyh_actualizacion =
              NOW()
        `,
        [
          id_usuario,

          asignacion.id_empresa,

          asignacion.id_rol,

          asignacion.es_principal,

          asignacion.estado,

          creado_por,
        ]
      );
    }


    // ==================================================
    // GARANTIZAR UNA PRINCIPAL ACTIVA
    // ==================================================

    const [principalActiva] =
      await connection.query(
        `
          SELECT
            id_usuario_empresa

          FROM tb_usuario_empresas

          WHERE
            id_usuario = ?
            AND estado = 1
            AND es_principal = 1

          LIMIT 1
        `,
        [
          id_usuario,
        ]
      );


    if (
      principalActiva.length === 0
    ) {

      const [primeraActiva] =
        await connection.query(
          `
            SELECT
              id_usuario_empresa

            FROM tb_usuario_empresas

            WHERE
              id_usuario = ?
              AND estado = 1

            ORDER BY
              id_usuario_empresa ASC

            LIMIT 1
          `,
          [
            id_usuario,
          ]
        );


      if (
        primeraActiva.length > 0
      ) {

        await connection.query(
          `
            UPDATE tb_usuario_empresas

            SET
              es_principal = 1,
              fyh_actualizacion = NOW()

            WHERE
              id_usuario_empresa = ?
          `,
          [
            primeraActiva[0]
              .id_usuario_empresa,
          ]
        );
      }
    }


    return nuevas;
  };


// ======================================================
// MANTENER COMPATIBILIDAD TEMPORAL
// tb_usuarios.id_empresa / id_rol
// ======================================================

const actualizarCompatibilidadUsuario =
  async ({
    connection,
    id_usuario,
  }) => {

    const [rows] =
      await connection.query(
        `
          SELECT
            id_empresa,
            id_rol

          FROM tb_usuario_empresas

          WHERE
            id_usuario = ?
            AND estado = 1

          ORDER BY
            es_principal DESC,
            id_usuario_empresa ASC

          LIMIT 1
        `,
        [
          id_usuario,
        ]
      );


    if (
      rows.length === 0
    ) {
      return;
    }


    await connection.query(
      `
        UPDATE tb_usuarios

        SET
          id_empresa = ?,
          id_rol = ?,
          fyh_actualizacion = NOW()

        WHERE id_usuario = ?
      `,
      [
        rows[0].id_empresa,
        rows[0].id_rol,
        id_usuario,
      ]
    );
  };


// ======================================================
// VALIDAR INACTIVACIÓN GLOBAL
// ======================================================

const validarInactivacionUsuario =
  async ({
    req,
    id_usuario,
    estadoNuevo,
  }) => {

    const [rows] =
      await pool.query(
        `
          SELECT
            u.id_usuario,
            u.estado,
            u.nombres

          FROM tb_usuarios u

          WHERE
            u.id_usuario = ?

          LIMIT 1
        `,
        [
          id_usuario,
        ]
      );


    if (
      rows.length === 0
    ) {
      return {
        ok: false,
        status: 404,

        message:
          "Usuario no encontrado",
      };
    }


    const usuario =
      rows[0];


    if (
      Number(
        estadoNuevo
      ) !== 0
    ) {
      return {
        ok: true,
        usuario,
      };
    }


    // No puede desactivarse
    // a sí mismo.
    if (
      Number(
        id_usuario
      ) ===
      Number(
        req.usuario.id_usuario
      )
    ) {
      return {
        ok: false,
        status: 400,

        message:
          "No puedes inactivar tu propio usuario",
      };
    }


    const asignaciones =
      await obtenerAsignacionesUsuario(
        pool,
        id_usuario,
        {
          soloActivas: true,
        }
      );


    // No desactivar un SUPER ADMIN.
    if (
      asignaciones.some(
        (item) =>
          esRolSuperAdmin(
            item.rol
          )
      )
    ) {
      return {
        ok: false,
        status: 403,

        message:
          "No se puede inactivar un usuario SUPER ADMIN",
      };
    }


    // Si quien ejecuta NO es SUPER ADMIN,
    // validar último administrador
    // de la empresa actual.
    if (
      !esRolSuperAdmin(
        req.usuario.rol
      )
    ) {

      const asignacionActual =
        asignaciones.find(
          (item) =>
            Number(
              item.id_empresa
            ) ===
            Number(
              req.usuario.id_empresa
            )
        );


      if (
        asignacionActual &&
        esRolAdmin(
          asignacionActual.rol
        )
      ) {

        const [adminsActivos] =
          await pool.query(
            `
              SELECT
                COUNT(
                  DISTINCT
                  ue.id_usuario
                ) AS total

              FROM tb_usuario_empresas ue

              INNER JOIN tb_usuarios u
                ON u.id_usuario =
                  ue.id_usuario

              INNER JOIN tb_roles r
                ON r.id_rol =
                  ue.id_rol

              WHERE
                ue.id_empresa = ?

                AND ue.estado = 1
                AND u.estado = 1
                AND r.estado = 1

                AND (
                  UPPER(r.rol) =
                    'ADMINISTRADOR'

                  OR

                  UPPER(r.rol) =
                    'ADMIN'
                )
            `,
            [
              req.usuario.id_empresa,
            ]
          );


        const totalAdmins =
          Number(
            adminsActivos[0]
              ?.total ||
            0
          );


        if (
          totalAdmins <= 1
        ) {
          return {
            ok: false,
            status: 400,

            message:
              "No puedes inactivar el último administrador activo de la empresa",
          };
        }
      }
    }


    return {
      ok: true,
      usuario,
    };
  };


// ======================================================
// LISTAR USUARIOS
// ======================================================

const getUsuarios = async (
  req,
  res
) => {

  try {

    const superAdmin =
      esRolSuperAdmin(
        req.usuario.rol
      );


    const id_empresa =
      Number(
        req.usuario.id_empresa
      );


    // ==================================================
    // USUARIOS
    // ==================================================

    const [usuariosRows] =
      await pool.query(
        `
          SELECT DISTINCT
            u.id_usuario,
            u.nombres,
            u.email,
            u.celular,
            u.foto,

            CAST(
              u.estado
              AS UNSIGNED
            ) AS estado,

            u.fyh_creacion,
            u.fyh_actualizacion

          FROM tb_usuarios u

          ${
            superAdmin
              ? ""
              : `
                INNER JOIN
                  tb_usuario_empresas
                  ue_scope

                  ON
                    ue_scope.id_usuario =
                      u.id_usuario

                  AND
                    ue_scope.id_empresa =
                      ?

                  AND
                    ue_scope.estado = 1
              `
          }

          ORDER BY
            u.id_usuario DESC
        `,
        superAdmin
          ? []
          : [
              id_empresa,
            ]
      );


    if (
      usuariosRows.length === 0
    ) {
      return res.json({
        ok: true,
        usuarios: [],
      });
    }


    // ==================================================
    // ASIGNACIONES
    // ==================================================

    const ids =
      usuariosRows.map(
        (usuario) =>
          usuario.id_usuario
      );


    const placeholders =
      ids
        .map(() => "?")
        .join(",");


    const [asignacionesRows] =
      await pool.query(
        `
          SELECT
            ue.id_usuario_empresa,
            ue.id_usuario,

            ue.id_empresa,
            e.nombre_empresa,
            e.logo,

            ue.id_rol,
            r.rol,

            CAST(
              ue.es_principal
              AS UNSIGNED
            ) AS es_principal,

            CAST(
              ue.estado
              AS UNSIGNED
            ) AS estado

          FROM tb_usuario_empresas ue

          INNER JOIN tb_empresas e
            ON e.id_empresa =
              ue.id_empresa

          INNER JOIN tb_roles r
            ON r.id_rol =
              ue.id_rol

          WHERE
            ue.id_usuario IN
            (${placeholders})

          ${
            superAdmin
              ? ""
              : `
                AND
                  ue.id_empresa = ?
              `
          }

          ORDER BY
            ue.id_usuario ASC,
            ue.es_principal DESC,
            e.nombre_empresa ASC
        `,
        superAdmin
          ? ids
          : [
              ...ids,
              id_empresa,
            ]
      );


    // ==================================================
    // AGRUPAR EMPRESAS POR USUARIO
    // ==================================================

    const asignacionesPorUsuario =
      new Map();


    for (
      const asignacion
      of asignacionesRows
    ) {

      const lista =
        asignacionesPorUsuario.get(
          asignacion.id_usuario
        ) ||
        [];


      lista.push(
        asignacion
      );


      asignacionesPorUsuario.set(
        asignacion.id_usuario,
        lista
      );
    }


    // ==================================================
    // RESPONSE
    // ==================================================

    const usuarios =
      usuariosRows.map(
        (usuario) => {

          const empresas =
            asignacionesPorUsuario.get(
              usuario.id_usuario
            ) ||
            [];


          const principal =
            empresas.find(
              (item) =>
                Number(
                  item.es_principal
                ) === 1
            ) ||
            empresas[0] ||
            null;


          return {
            ...usuario,

            // Compatibilidad con
            // frontend anterior.
            id_empresa:
              principal
                ?.id_empresa ||
              null,

            nombre_empresa:
              principal
                ?.nombre_empresa ||
              null,

            id_rol:
              principal
                ?.id_rol ||
              null,

            rol:
              principal
                ?.rol ||
              null,


            // MULTIEMPRESA
            empresas,

            total_empresas:
              empresas.length,
          };
        }
      );


    return res.json({
      ok: true,
      usuarios,
    });

  } catch (error) {

    console.error(
      "ERROR LISTANDO USUARIOS:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al listar usuarios",

        error:
          error.message,
      });
  }
};


// ======================================================
// BUSCAR USUARIO POR ID
// ======================================================

const getUsuarioById =
  async (
    req,
    res
  ) => {

    try {

      const id_usuario =
        Number(
          req.params.id
        );


      if (
        !Number.isInteger(
          id_usuario
        ) ||
        id_usuario <= 0
      ) {
        return res
          .status(400)
          .json({
            ok: false,

            message:
              "Usuario inválido",
          });
      }


      const [rows] =
        await pool.query(
          `
            SELECT
              u.id_usuario,
              u.nombres,
              u.email,
              u.celular,

              u.foto,
              u.foto_public_id,

              CAST(
                u.estado
                AS UNSIGNED
              ) AS estado,

              u.fyh_creacion,
              u.fyh_actualizacion

            FROM tb_usuarios u

            WHERE
              u.id_usuario = ?

            LIMIT 1
          `,
          [
            id_usuario,
          ]
        );


      if (
        rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            ok: false,

            message:
              "Usuario no encontrado",
          });
      }


      const superAdmin =
        esRolSuperAdmin(
          req.usuario.rol
        );


      const empresas =
        await obtenerAsignacionesUsuario(
          pool,
          id_usuario,

          superAdmin
            ? {}
            : {
                id_empresa:
                  req.usuario
                    .id_empresa,
              }
        );


      if (
        !superAdmin &&
        empresas.length === 0
      ) {
        return res
          .status(403)
          .json({
            ok: false,

            message:
              "No tiene acceso a este usuario",
          });
      }


      const principal =
        empresas.find(
          (item) =>
            Number(
              item.es_principal
            ) === 1
        ) ||
        empresas[0] ||
        null;


      return res.json({
        ok: true,

        usuario: {
          ...rows[0],

          id_empresa:
            principal
              ?.id_empresa ||
            null,

          nombre_empresa:
            principal
              ?.nombre_empresa ||
            null,

          id_rol:
            principal
              ?.id_rol ||
            null,

          rol:
            principal
              ?.rol ||
            null,

          empresas,
        },
      });

    } catch (error) {

      console.error(
        "ERROR BUSCANDO USUARIO:",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,

          message:
            "Error al buscar usuario",

          error:
            error.message,
        });
    }
  };


// ======================================================
// CREAR USUARIO MULTIEMPRESA
// ======================================================

const createUsuario = async (
  req,
  res
) => {

  const connection =
    await pool.getConnection();


  try {

    const {
      nombres,
      email,
      celular,
      password_user,
      estado = 1,
    } = req.body;


    // ==================================================
    // EMPRESAS
    // ==================================================

    let asignaciones =
      normalizarAsignaciones(
        req.body.empresas
      );


    // Compatibilidad temporal
    // con frontend viejo.
    if (
      asignaciones.length === 0 &&
      req.body.id_empresa &&
      req.body.id_rol
    ) {
      asignaciones = [
        {
          id_empresa:
            Number(
              req.body.id_empresa
            ),

          id_rol:
            Number(
              req.body.id_rol
            ),

          es_principal: 1,
          estado: 1,
        },
      ];
    }


    asignaciones =
      asegurarEmpresaPrincipal(
        asignaciones
      );


    // ==================================================
    // VALIDACIONES
    // ==================================================

    if (
      !nombres?.trim() ||
      !email?.trim() ||
      !password_user
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Nombres, email y contraseña son obligatorios",
        });
    }


    if (
      asignaciones.length === 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Debe asignar al menos una empresa y un rol al usuario",
        });
    }


    const duplicadas =
      validarAsignacionesDuplicadas(
        asignaciones
      );


    if (
      !duplicadas.ok
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            duplicadas.message,
        });
    }


    const validacionBD =
      await validarAsignacionesContraBD({
        executor:
          connection,

        asignaciones,

        req,
      });


    if (
      !validacionBD.ok
    ) {
      return res
        .status(
          validacionBD.status
        )
        .json({
          ok: false,

          message:
            validacionBD.message,
        });
    }


    const emailNormalizado =
      email
        .trim()
        .toLowerCase();


    const [existe] =
      await connection.query(
        `
          SELECT
            id_usuario

          FROM tb_usuarios

          WHERE
            LOWER(email) = ?

          LIMIT 1
        `,
        [
          emailNormalizado,
        ]
      );


    if (
      existe.length > 0
    ) {
      return res
        .status(409)
        .json({
          ok: false,

          message:
            "Ya existe un usuario con ese email",
        });
    }


    // ==================================================
    // TRANSACCIÓN
    // ==================================================

    await connection.beginTransaction();


    const passwordHash =
      await bcrypt.hash(
        password_user,
        10
      );


    const principal =
      asignaciones.find(
        (item) =>
          Number(
            item.es_principal
          ) === 1
      ) ||
      asignaciones[0];


    // ==================================================
    // CREAR USUARIO
    //
    // id_empresa / id_rol se mantienen
    // temporalmente por compatibilidad.
    // ==================================================

    const [result] =
      await connection.query(
        `
          INSERT INTO tb_usuarios
          (
            id_empresa,
            nombres,
            email,
            celular,
            password_user,
            id_rol,
            estado,
            fyh_creacion
          )
          VALUES
          (
            ?, ?, ?, ?, ?, ?, ?,
            NOW()
          )
        `,
        [
          principal.id_empresa,

          nombres.trim(),

          emailNormalizado,

          celular?.trim() ||
          null,

          passwordHash,

          principal.id_rol,

          normalizarEstado(
            estado,
            1
          ),
        ]
      );


    const id_usuario =
      result.insertId;


    // ==================================================
    // ASIGNAR EMPRESAS
    // ==================================================

    await sincronizarAsignacionesUsuario({
      connection,

      id_usuario,

      asignaciones,

      creado_por:
        req.usuario.id_usuario,
    });


    await connection.commit();


    // ==================================================
    // LOG
    // ==================================================

    await registrarLog({
      req,

      modulo:
        "Usuarios",

      accion:
        "CREAR",

      descripcion:
        `Creó el usuario ${nombres.trim()} con ${asignaciones.length} empresa(s) asignada(s)`,
    });


    return res
      .status(201)
      .json({
        ok: true,

        message:
          "Usuario creado correctamente",

        id_usuario,
      });

  } catch (error) {

    try {
      await connection.rollback();
    } catch (_) {}


    console.error(
      "ERROR CREANDO USUARIO:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al crear usuario",

        error:
          error.message,
      });

  } finally {

    connection.release();
  }
};


// ======================================================
// ACTUALIZAR USUARIO MULTIEMPRESA
// ======================================================

const updateUsuario = async (
  req,
  res
) => {

  const connection =
    await pool.getConnection();


  try {

    const id_usuario =
      Number(
        req.params.id
      );


    const {
      nombres,
      email,
      celular,
      password_user,
      estado,
    } = req.body;


    if (
      !Number.isInteger(
        id_usuario
      ) ||
      id_usuario <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Usuario inválido",
        });
    }


    if (
      !nombres?.trim() ||
      !email?.trim()
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Nombres y email son obligatorios",
        });
    }


    const superAdmin =
      esRolSuperAdmin(
        req.usuario.rol
      );


    // ==================================================
    // EMPRESAS
    // ==================================================

    let asignaciones =
      normalizarAsignaciones(
        req.body.empresas
      );


    // Compatibilidad frontend antiguo.
    if (
      asignaciones.length === 0 &&
      req.body.id_empresa &&
      req.body.id_rol
    ) {
      asignaciones = [
        {
          id_empresa:
            Number(
              req.body.id_empresa
            ),

          id_rol:
            Number(
              req.body.id_rol
            ),

          es_principal: 1,
          estado: 1,
        },
      ];
    }


    if (
      asignaciones.length === 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Debe mantener al menos una empresa asignada al usuario",
        });
    }


    // ADMIN NORMAL:
    // solo puede modificar
    // la empresa activa.
    if (!superAdmin) {

      asignaciones =
        asignaciones.filter(
          (item) =>
            Number(
              item.id_empresa
            ) ===
            Number(
              req.usuario
                .id_empresa
            )
        );


      if (
        asignaciones.length === 0
      ) {
        return res
          .status(403)
          .json({
            ok: false,

            message:
              "No tiene permiso para modificar las empresas de este usuario",
          });
      }
    }


    asignaciones =
      asegurarEmpresaPrincipal(
        asignaciones
      );


    const duplicadas =
      validarAsignacionesDuplicadas(
        asignaciones
      );


    if (
      !duplicadas.ok
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            duplicadas.message,
        });
    }


    const validacionBD =
      await validarAsignacionesContraBD({
        executor:
          connection,

        asignaciones,

        req,
      });


    if (
      !validacionBD.ok
    ) {
      return res
        .status(
          validacionBD.status
        )
        .json({
          ok: false,

          message:
            validacionBD.message,
        });
    }


    // ==================================================
    // USUARIO EXISTE
    // ==================================================

    const [usuarioExiste] =
      await connection.query(
        `
          SELECT
            id_usuario

          FROM tb_usuarios

          WHERE
            id_usuario = ?

          LIMIT 1
        `,
        [
          id_usuario,
        ]
      );


    if (
      usuarioExiste.length === 0
    ) {
      return res
        .status(404)
        .json({
          ok: false,

          message:
            "Usuario no encontrado",
        });
    }


    // ==================================================
    // EMAIL
    // ==================================================

    const emailNormalizado =
      email
        .trim()
        .toLowerCase();


    const [emailExiste] =
      await connection.query(
        `
          SELECT
            id_usuario

          FROM tb_usuarios

          WHERE
            LOWER(email) = ?

            AND
            id_usuario <> ?

          LIMIT 1
        `,
        [
          emailNormalizado,
          id_usuario,
        ]
      );


    if (
      emailExiste.length > 0
    ) {
      return res
        .status(409)
        .json({
          ok: false,

          message:
            "Ese email ya está usado por otro usuario",
        });
    }


    // ==================================================
    // VALIDAR INACTIVACIÓN
    // ==================================================

    const validacionInactivacion =
      await validarInactivacionUsuario({
        req,

        id_usuario,

        estadoNuevo:
          normalizarEstado(
            estado,
            1
          ),
      });


    if (
      !validacionInactivacion.ok
    ) {
      return res
        .status(
          validacionInactivacion.status
        )
        .json({
          ok: false,

          message:
            validacionInactivacion.message,
        });
    }


    // ==================================================
    // TRANSACCIÓN
    // ==================================================

    await connection.beginTransaction();


    // ==================================================
    // ACTUALIZAR USUARIO
    // ==================================================

    if (
      password_user &&
      password_user.trim() !== ""
    ) {

      const passwordHash =
        await bcrypt.hash(
          password_user,
          10
        );


      await connection.query(
        `
          UPDATE tb_usuarios

          SET
            nombres = ?,
            email = ?,
            celular = ?,
            password_user = ?,
            estado = ?,
            fyh_actualizacion = NOW()

          WHERE
            id_usuario = ?
        `,
        [
          nombres.trim(),

          emailNormalizado,

          celular?.trim() ||
          null,

          passwordHash,

          normalizarEstado(
            estado,
            1
          ),

          id_usuario,
        ]
      );

    } else {

      await connection.query(
        `
          UPDATE tb_usuarios

          SET
            nombres = ?,
            email = ?,
            celular = ?,
            estado = ?,
            fyh_actualizacion = NOW()

          WHERE
            id_usuario = ?
        `,
        [
          nombres.trim(),

          emailNormalizado,

          celular?.trim() ||
          null,

          normalizarEstado(
            estado,
            1
          ),

          id_usuario,
        ]
      );
    }


    // ==================================================
    // SINCRONIZAR EMPRESAS
    // ==================================================

    await sincronizarAsignacionesUsuario({
      connection,

      id_usuario,

      asignaciones,

      creado_por:
        req.usuario.id_usuario,

      conservarEmpresasNoAdministrables:
        !superAdmin,

      id_empresa_actual:
        req.usuario.id_empresa,
    });


    // ==================================================
    // COMPATIBILIDAD TEMPORAL
    // ==================================================

    await actualizarCompatibilidadUsuario({
      connection,
      id_usuario,
    });


    await connection.commit();


    // ==================================================
    // LOG
    // ==================================================

    await registrarLog({
      req,

      modulo:
        "Usuarios",

      accion:
        "ACTUALIZAR",

      descripcion:
        `Actualizó el usuario ID ${id_usuario} y sus asignaciones de empresa`,
    });


    return res.json({
      ok: true,

      message:
        "Usuario actualizado correctamente",
    });

  } catch (error) {

    try {
      await connection.rollback();
    } catch (_) {}


    console.error(
      "ERROR ACTUALIZANDO USUARIO:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al actualizar usuario",

        error:
          error.message,
      });

  } finally {

    connection.release();
  }
};


// ======================================================
// DESACTIVAR USUARIO
// ======================================================

const deleteUsuario = async (
  req,
  res
) => {

  try {

    const id_usuario =
      Number(
        req.params.id
      );


    const validacion =
      await validarInactivacionUsuario({
        req,

        id_usuario,

        estadoNuevo: 0,
      });


    if (
      !validacion.ok
    ) {
      return res
        .status(
          validacion.status
        )
        .json({
          ok: false,

          message:
            validacion.message,
        });
    }


    const usuario =
      validacion.usuario;


    await pool.query(
      `
        UPDATE tb_usuarios

        SET
          estado = 0,
          fyh_actualizacion = NOW()

        WHERE
          id_usuario = ?
      `,
      [
        id_usuario,
      ]
    );


    await registrarLog({
      req,

      modulo:
        "Usuarios",

      accion:
        "DESACTIVAR",

      descripcion:
        `Desactivó el usuario ${usuario.nombres} ID ${id_usuario}`,
    });


    return res.json({
      ok: true,

      message:
        "Usuario desactivado correctamente",
    });

  } catch (error) {

    console.error(
      "ERROR DESACTIVANDO USUARIO:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al desactivar usuario",

        error:
          error.message,
      });
  }
};


// ======================================================
// MI PERFIL
// ======================================================

const getMiPerfil = async (
  req,
  res
) => {

  try {

    const id_usuario =
      req.usuario.id_usuario;


    const [rows] =
      await pool.query(
        `
          SELECT
            u.id_usuario,
            u.nombres,
            u.email,
            u.celular,

            u.foto,
            u.foto_public_id,

            CAST(
              u.estado
              AS UNSIGNED
            ) AS estado

          FROM tb_usuarios u

          WHERE
            u.id_usuario = ?

          LIMIT 1
        `,
        [
          id_usuario,
        ]
      );


    if (
      rows.length === 0
    ) {
      return res
        .status(404)
        .json({
          ok: false,

          message:
            "Usuario no encontrado",
        });
    }


    return res.json({
      ok: true,

      usuario: {
        ...rows[0],

        id_empresa:
          req.usuario.id_empresa,

        nombre_empresa:
          req.usuario
            .nombre_empresa,

        id_rol:
          req.usuario.id_rol,

        rol:
          req.usuario.rol,
      },
    });

  } catch (error) {

    console.error(
      "ERROR OBTENIENDO PERFIL:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al obtener perfil",

        error:
          error.message,
      });
  }
};


// ======================================================
// ACTUALIZAR MI PERFIL
// ======================================================

const updateMiPerfil = async (
  req,
  res
) => {

  try {

    const id_usuario =
      req.usuario.id_usuario;


    const {
      nombres,
      celular,
    } = req.body;


    if (
      !nombres?.trim()
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "El nombre es obligatorio",
        });
    }


    await pool.query(
      `
        UPDATE tb_usuarios

        SET
          nombres = ?,
          celular = ?,
          fyh_actualizacion = NOW()

        WHERE
          id_usuario = ?
      `,
      [
        nombres.trim(),

        celular?.trim() ||
        null,

        id_usuario,
      ]
    );


    await registrarLog({
      req,

      modulo:
        "Perfil Usuario",

      accion:
        "ACTUALIZAR",

      descripcion:
        "Actualizó su perfil de usuario",
    });


    return res.json({
      ok: true,

      message:
        "Perfil actualizado correctamente",
    });

  } catch (error) {

    console.error(
      "ERROR ACTUALIZANDO PERFIL:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al actualizar perfil",

        error:
          error.message,
      });
  }
};


// ======================================================
// CAMBIAR CONTRASEÑA
// ======================================================

const cambiarPassword = async (
  req,
  res
) => {

  try {

    const id_usuario =
      req.usuario.id_usuario;


    const {
      password_actual,
      password_nuevo,
      password_confirmar,
    } = req.body;


    if (
      !password_actual ||
      !password_nuevo ||
      !password_confirmar
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Todos los campos son obligatorios",
        });
    }


    if (
      password_nuevo !==
      password_confirmar
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Las contraseñas no coinciden",
        });
    }


    const [rows] =
      await pool.query(
        `
          SELECT
            password_user

          FROM tb_usuarios

          WHERE
            id_usuario = ?

          LIMIT 1
        `,
        [
          id_usuario,
        ]
      );


    if (
      rows.length === 0
    ) {
      return res
        .status(404)
        .json({
          ok: false,

          message:
            "Usuario no encontrado",
        });
    }


    const usuario =
      rows[0];


    let passwordValida =
      false;


    if (
      usuario
        .password_user
        ?.startsWith("$2")
    ) {

      passwordValida =
        await bcrypt.compare(
          password_actual,
          usuario.password_user
        );

    } else {

      passwordValida =
        usuario.password_user ===
        password_actual;
    }


    if (
      !passwordValida
    ) {
      return res
        .status(401)
        .json({
          ok: false,

          message:
            "La contraseña actual es incorrecta",
        });
    }


    const passwordHash =
      await bcrypt.hash(
        password_nuevo,
        10
      );


    await pool.query(
      `
        UPDATE tb_usuarios

        SET
          password_user = ?,
          fyh_actualizacion = NOW()

        WHERE
          id_usuario = ?
      `,
      [
        passwordHash,
        id_usuario,
      ]
    );


    await registrarLog({
      req,

      modulo:
        "Perfil Usuario",

      accion:
        "CAMBIAR_PASSWORD",

      descripcion:
        "Cambió su contraseña",
    });


    return res.json({
      ok: true,

      message:
        "Contraseña actualizada correctamente",
    });

  } catch (error) {

    console.error(
      "ERROR CAMBIANDO PASSWORD:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al cambiar contraseña",

        error:
          error.message,
      });
  }
};


// ======================================================
// SUBIR FOTO DE MI PERFIL
// ======================================================

const updateFotoMiPerfil = async (
  req,
  res
) => {

  try {

    const id_usuario =
      req.usuario.id_usuario;


    if (!req.file) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Debe seleccionar una foto",
        });
    }


    // ==================================================
    // FOTO ANTERIOR
    // ==================================================

    const [[usuario]] =
      await pool.query(
        `
          SELECT
            foto,
            foto_public_id

          FROM tb_usuarios

          WHERE
            id_usuario = ?
        `,
        [
          id_usuario,
        ]
      );


    // ==================================================
    // ELIMINAR CLOUDINARY
    // ==================================================

    await eliminarImagen(
      usuario
        ?.foto_public_id
    );


    // ==================================================
    // SUBIR NUEVA FOTO
    // ==================================================

    const nombreFoto =
      `usuario-${Date.now()}`;


    const resultado =
      await subirImagen({
        rutaTemporal:
          req.file.path,

        carpeta:
          "usuarios",

        nombreArchivo:
          nombreFoto,

        width:
          1000,

        height:
          1000,

        quality:
          85,
      });


    // ==================================================
    // BD
    // ==================================================

    await pool.query(
      `
        UPDATE tb_usuarios

        SET
          foto = ?,
          foto_public_id = ?,
          fyh_actualizacion = NOW()

        WHERE
          id_usuario = ?
      `,
      [
        resultado.secure_url,

        resultado.public_id,

        id_usuario,
      ]
    );


    await registrarLog({
      req,

      modulo:
        "Perfil Usuario",

      accion:
        "ACTUALIZAR_FOTO",

      descripcion:
        "Actualizó su foto de perfil",
    });


    return res.json({
      ok: true,

      message:
        "Foto actualizada correctamente",

      foto:
        resultado.secure_url,
    });

  } catch (error) {

    console.error(
      "ERROR ACTUALIZANDO FOTO:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al actualizar foto",

        error:
          error.message,
      });
  }
};


// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  cambiarPassword,

  getMiPerfil,
  updateMiPerfil,
  updateFotoMiPerfil,

  getUsuarios,
  getUsuarioById,

  createUsuario,
  updateUsuario,
  deleteUsuario,
};