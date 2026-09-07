import {
  Building2,
  CheckCircle2,
  Loader2,
  LogOut,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import Swal from "sweetalert2";

import {
  useAuth,
} from "../context/AuthContext";

import {
  getDefaultRoute,
} from "../utils/getDefaultRoute";


// ======================================================
// LOGO EMPRESA
// ======================================================

const obtenerLogoEmpresa = (
  logo
) => {

  const valor =
    String(
      logo || ""
    ).trim();


  if (!valor) {
    return "";
  }


  // Cloudinary u otra URL pública completa.
  if (
    /^https?:\/\//i.test(
      valor
    )
  ) {
    return valor;
  }


  const base =
    String(
      import.meta.env
        .VITE_FILES_URL ||
      ""
    )
      .trim()
      .replace(
        /\/+$/,
        ""
      );


  if (!base) {
    return "";
  }


  if (
    valor.startsWith(
      "/uploads/"
    )
  ) {
    return (
      base +
      valor
    );
  }


  if (
    valor.startsWith(
      "uploads/"
    )
  ) {
    return (
      `${base}/${valor}`
    );
  }


  if (
    valor.startsWith(
      "logos/"
    )
  ) {
    return (
      `${base}/uploads/${valor}`
    );
  }


  return (
    `${base}/uploads/logos/${valor}`
  );
};


// ======================================================
// COMPONENTE
// ======================================================

export default function SeleccionarEmpresa() {

  const navigate =
    useNavigate();


  const {
    user,
    empresas,
    cambiarEmpresa,
    cambiandoEmpresa,
    logout,
  } =
    useAuth();


  const [
    empresaProcesando,
    setEmpresaProcesando,
  ] =
    useState(null);


  const empresasDisponibles =
    useMemo(
      () =>
        Array.isArray(empresas)
          ? empresas
          : [],
      [empresas]
    );


  // ====================================================
  // SIN SESIÓN
  // ====================================================

  if (!user) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  // ====================================================
  // SI SOLO TIENE UNA EMPRESA
  // ====================================================

  if (
    empresasDisponibles.length === 1
  ) {
    return (
      <Navigate
        to={
          getDefaultRoute(user)
        }
        replace
      />
    );
  }


  // ====================================================
  // SELECCIONAR EMPRESA
  // ====================================================

  const seleccionarEmpresa =
    async (
      empresa
    ) => {

      if (
        cambiandoEmpresa ||
        empresaProcesando
      ) {
        return;
      }


      const idEmpresa =
        Number(
          empresa.id_empresa
        );


      if (
        !Number.isInteger(
          idEmpresa
        ) ||
        idEmpresa <= 0
      ) {
        return;
      }


      try {

        setEmpresaProcesando(
          idEmpresa
        );


        const resultado =
          await cambiarEmpresa(
            idEmpresa
          );


        if (!resultado.ok) {

          await Swal.fire({
            icon:
              "error",

            title:
              "Could not open company",

            text:
              resultado.message ||
              "Unable to select the company.",

            confirmButtonText:
              "OK",
          });

          return;
        }


        navigate(
          getDefaultRoute(
            resultado.usuario ||
            user
          ),
          {
            replace: true,
          }
        );

      } finally {

        setEmpresaProcesando(
          null
        );
      }
    };


  // ====================================================
  // LOGOUT
  // ====================================================

  const cerrarSesion =
    async () => {

      await logout();

      navigate(
        "/",
        {
          replace: true,
        }
      );
    };


  // ====================================================
  // UI
  // ====================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-100
        px-4
        py-8
      "
    >

      <div
        className="
          mx-auto
          w-full
          max-w-6xl
        "
      >

        <div
          className="
            mb-8
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >

          <div>
            <p
              className="
                text-sm
                font-semibold
                text-blue-600
              "
            >
              DigiThex ERP
            </p>

            <h1
              className="
                mt-1
                text-3xl
                font-bold
                tracking-tight
                text-slate-900
              "
            >
              Select a company
            </h1>

            <p
              className="
                mt-2
                text-sm
                text-slate-500
              "
            >
              Welcome,{" "}
              <span
                className="
                  font-semibold
                  text-slate-700
                "
              >
                {user.nombres}
              </span>
              . Choose the company you want to work with.
            </p>
          </div>


          <button
            type="button"
            onClick={
              cerrarSesion
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-slate-600
              shadow-sm
              transition
              hover:bg-slate-50
            "
          >
            <LogOut
              size={17}
            />

            Sign out
          </button>

        </div>


        <div
          className="
            rounded-3xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            sm:p-7
          "
        >

          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >

            {
              empresasDisponibles.map(
                (empresa) => {

                  const activa =
                    Number(
                      user.id_empresa
                    ) ===
                    Number(
                      empresa.id_empresa
                    );


                  const procesando =
                    Number(
                      empresaProcesando
                    ) ===
                    Number(
                      empresa.id_empresa
                    );


                  const logo =
                    obtenerLogoEmpresa(
                      empresa.logo
                    );


                  return (
                    <button
                      key={
                        empresa.id_empresa
                      }
                      type="button"
                      disabled={
                        Boolean(
                          empresaProcesando
                        ) ||
                        cambiandoEmpresa
                      }
                      onClick={() =>
                        seleccionarEmpresa(
                          empresa
                        )
                      }
                      className="
                        group
                        relative
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        text-left
                        shadow-sm
                        transition
                        hover:-translate-y-0.5
                        hover:border-blue-300
                        hover:shadow-md
                        disabled:cursor-wait
                        disabled:opacity-70
                      "
                    >

                      {
                        activa && (
                          <div
                            className="
                              absolute
                              right-3
                              top-3
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              bg-emerald-50
                              px-2
                              py-1
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wide
                              text-emerald-700
                            "
                          >
                            <CheckCircle2
                              size={12}
                            />

                            Current
                          </div>
                        )
                      }


                      <div
                        className="
                          flex
                          h-28
                          items-center
                          justify-center
                          rounded-2xl
                          bg-slate-50
                          p-4
                        "
                      >

                        {
                          logo
                            ? (
                                <img
                                  src={logo}
                                  alt={
                                    empresa.nombre_empresa ||
                                    "Company"
                                  }
                                  className="
                                    max-h-20
                                    max-w-full
                                    object-contain
                                  "
                                  onError={
                                    (event) => {
                                      event.currentTarget
                                        .style
                                        .display =
                                        "none";
                                    }
                                  }
                                />
                              )
                            : (
                                <div
                                  className="
                                    flex
                                    h-16
                                    w-16
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-slate-900
                                    text-white
                                  "
                                >
                                  <Building2
                                    size={30}
                                  />
                                </div>
                              )
                        }

                      </div>


                      <div
                        className="
                          mt-4
                        "
                      >
                        <p
                          className="
                            truncate
                            text-base
                            font-bold
                            text-slate-900
                          "
                          title={
                            empresa.nombre_empresa
                          }
                        >
                          {
                            empresa.nombre_empresa
                          }
                        </p>

                        <p
                          className="
                            mt-1
                            truncate
                            text-xs
                            text-slate-500
                          "
                        >
                          {
                            empresa.rol ||
                            "Company access"
                          }
                        </p>
                      </div>


                      <div
                        className="
                          mt-4
                          flex
                          items-center
                          justify-between
                          border-t
                          border-slate-100
                          pt-3
                        "
                      >
                        <span
                          className="
                            text-xs
                            font-semibold
                            text-blue-600
                          "
                        >
                          Open company
                        </span>

                        {
                          procesando
                            ? (
                                <Loader2
                                  size={17}
                                  className="
                                    animate-spin
                                    text-blue-600
                                  "
                                />
                              )
                            : (
                                <span
                                  className="
                                    text-lg
                                    text-slate-300
                                    transition
                                    group-hover:translate-x-0.5
                                    group-hover:text-blue-500
                                  "
                                >
                                  →
                                </span>
                              )
                        }
                      </div>

                    </button>
                  );
                }
              )
            }

          </div>

        </div>

      </div>

    </div>
  );
}
