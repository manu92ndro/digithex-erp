import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getImageUrl } from "../utils/imageUrl";

import {
  ClipboardList,
  LayoutDashboard,
  Building,
  Building2,
  Users,
  ShieldCheck,
  UserRound,
  KeyRound,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  Truck,
  CalendarDays,
  Trash2,
  Settings,
  ChevronsUpDown,
  Check,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";

const FILES_URL =
  import.meta.env.VITE_FILES_URL ||
  "http://localhost:3000";

const iconMap = {
  LayoutDashboard,
  Building,
  Building2,
  Users,
  ShieldCheck,
  UserRound,
  ClipboardList,
  KeyRound,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  Truck,
  CalendarDays,
  Trash2,
  Settings,
};

export default function Sidebar({
  onNavigate,
}) {
  const {
    user,
    empresas,
    empresaActiva,
    tieneVariasEmpresas,
    cambiarEmpresa,
    cambiandoEmpresa,
  } = useAuth();

  const { t } = useTranslation();

  const navigate = useNavigate();

  const [
    selectorEmpresasAbierto,
    setSelectorEmpresasAbierto,
  ] = useState(false);

  const selectorRef = useRef(null);


  // ======================================================
  // LOGO EMPRESA ACTIVA
  // ======================================================

  const logoEmpresa =
    empresaActiva?.logo ||
    user?.logo_empresa ||
    "";

  const logoUrl = logoEmpresa
    ? getImageUrl(
        logoEmpresa,
        "logos"
      )
    : "";


  // ======================================================
  // MÓDULOS EMPRESA ACTIVA
  // ======================================================

  const modulos =
    user?.modulos || [];


  // ======================================================
  // CERRAR SELECTOR AL HACER CLICK AFUERA
  // ======================================================

  useEffect(() => {
    const cerrarSelector = (
      event
    ) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(
          event.target
        )
      ) {
        setSelectorEmpresasAbierto(
          false
        );
      }
    };


    document.addEventListener(
      "mousedown",
      cerrarSelector
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        cerrarSelector
      );
    };
  }, []);


  // ======================================================
  // CLASE LINKS
  // ======================================================

  const linkClass = ({
    isActive,
  }) =>
    `
      flex
      items-center
      gap-3
      py-3
      px-4
      rounded-xl
      transition

      ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }
    `;


  // ======================================================
  // LABEL MÓDULOS
  // ======================================================

  const getModuleLabel = (
    modulo
  ) => {
    const key = `menu_${modulo.nombre_modulo
      ?.toLowerCase()
      ?.replace(/\s+/g, "_")}`;

    return t(
      key,
      modulo.nombre_modulo
    );
  };


  // ======================================================
  // CAMBIAR EMPRESA
  // ======================================================

  // ======================================================
// CAMBIAR EMPRESA
// ======================================================

const handleCambiarEmpresa = async (idEmpresa) => {
  const id_empresa = Number(idEmpresa);

  if (
    !id_empresa ||
    id_empresa === Number(
      empresaActiva?.id_empresa
    )
  ) {
    setSelectorEmpresasAbierto(false);
    return;
  }

  // ====================================================
  // 1. IR A UNA RUTA SEGURA
  // ====================================================

  navigate("/perfil", {
    replace: true,
  });

  // ====================================================
  // 2. CAMBIAR EMPRESA
  // ====================================================

  const resultado =
    await cambiarEmpresa(
      id_empresa
    );

  if (!resultado?.ok) {
    console.error(
      "ERROR CAMBIANDO EMPRESA:",
      resultado?.message
    );

    return;
  }

  // ====================================================
  // 3. MÓDULOS NUEVOS
  // ====================================================

  const modulosNuevos =
    Array.isArray(
      resultado.usuario?.modulos
    )
      ? resultado.usuario.modulos
      : [];

  // ====================================================
  // 4. BUSCAR DASHBOARD
  // ====================================================

  const moduloDashboard =
    modulosNuevos.find(
      (modulo) =>
        modulo.ruta === "/dashboard"
    );

  // ====================================================
  // 5. RUTA DESTINO
  // ====================================================

  const primeraRutaPermitida =
    moduloDashboard?.ruta ||
    modulosNuevos[0]?.ruta ||
    "/perfil";

  // ====================================================
  // 6. CERRAR SELECTOR
  // ====================================================

  setSelectorEmpresasAbierto(false);

  // ====================================================
  // 7. NAVEGAR A LA NUEVA EMPRESA
  // ====================================================

  navigate(
    primeraRutaPermitida,
    {
      replace: true,
    }
  );

  if (onNavigate) {
    onNavigate();
  }
};


  // ======================================================
  // RENDER
  // ======================================================

  return (
    <aside
      className="
        flex
        h-screen
        w-64
        flex-col
        bg-slate-900
        text-white
      "
    >

      {/* ================================================= */}
      {/* EMPRESA */}
      {/* ================================================= */}

      <div
        className="
          border-b
          border-slate-700
          p-4
        "
      >

        <div
          className="
            flex
            flex-col
            items-center
            text-center
          "
        >

          {/* LOGO */}

          <div
            className="
              flex
              h-20
              w-20
              items-center
              justify-center
              overflow-hidden
              rounded-2xl
              border
              border-slate-700
              bg-slate-800
              shadow
            "
          >

            {logoUrl ? (
              <img
                src={logoUrl}
                alt={
                  empresaActiva
                    ?.nombre_empresa ||
                  user
                    ?.nombre_empresa ||
                  t("company")
                }
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : (
              <Building2
                size={34}
                className="
                  text-slate-300
                "
              />
            )}

          </div>


          {/* =============================================== */}
          {/* UNA SOLA EMPRESA */}
          {/* =============================================== */}

          {!tieneVariasEmpresas && (

            <div
              className="
                mt-3
                w-full
              "
            >

              <h2
                className="
                  w-full
                  truncate
                  text-base
                  font-bold
                "
              >
                {empresaActiva
                  ?.nombre_empresa ||
                  user
                    ?.nombre_empresa ||
                  t("system")}
              </h2>


              {user?.rol && (
                <p
                  className="
                    mt-1
                    truncate
                    text-xs
                    text-slate-400
                  "
                >
                  {user.rol}
                </p>
              )}

            </div>

          )}


          {/* =============================================== */}
          {/* SELECTOR MULTIEMPRESA */}
          {/* =============================================== */}

          {tieneVariasEmpresas && (

            <div
              ref={selectorRef}
              className="
                relative
                mt-3
                w-full
              "
            >

              {/* BOTÓN */}

              <button
                type="button"
                onClick={() =>
                  setSelectorEmpresasAbierto(
                    (prev) =>
                      !prev
                  )
                }
                disabled={
                  cambiandoEmpresa
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  gap-2
                  rounded-xl
                  border
                  border-slate-700
                  bg-slate-800
                  px-3
                  py-2.5
                  text-left
                  transition
                  hover:bg-slate-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >

                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <p
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-white
                    "
                  >
                    {empresaActiva
                      ?.nombre_empresa ||
                      user
                        ?.nombre_empresa}
                  </p>


                  <p
                    className="
                      truncate
                      text-[11px]
                      text-slate-400
                    "
                  >
                    {empresaActiva
                      ?.rol ||
                      user?.rol ||
                      ""}
                  </p>

                </div>


                {cambiandoEmpresa ? (
                  <Loader2
                    size={17}
                    className="
                      shrink-0
                      animate-spin
                      text-slate-300
                    "
                  />
                ) : (
                  <ChevronsUpDown
                    size={17}
                    className="
                      shrink-0
                      text-slate-400
                    "
                  />
                )}

              </button>


              {/* ============================================= */}
              {/* DROPDOWN */}
              {/* ============================================= */}

              {selectorEmpresasAbierto && (
                <div
                  className="
                    absolute
                    left-0
                    right-0
                    top-full
                    z-50
                    mt-2
                    max-h-72
                    overflow-y-auto
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-800
                    p-1.5
                    shadow-2xl
                  "
                >

                  <p
                    className="
                      px-2
                      pb-1.5
                      pt-1
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-slate-500
                    "
                  >
                    {t(
                      "select_company"
                    )}
                  </p>


                  {empresas.map(
                    (
                      empresa
                    ) => {

                      const activa =
                        Number(
                          empresa.id_empresa
                        ) ===
                        Number(
                          empresaActiva
                            ?.id_empresa
                        );


                      const logo =
                        empresa.logo
                          ? getImageUrl(
                              empresa.logo,
                              "logos"
                            )
                          : "";


                      return (
                        <button
                          key={
                            empresa.id_empresa
                          }
                          type="button"
                          onClick={() =>
                            handleCambiarEmpresa(
                              empresa.id_empresa

                              
                            )

                            
                          }

                          
                          disabled={
                            activa ||
                            cambiandoEmpresa
                          }
                          className={`
                            flex
                            w-full
                            items-center
                            gap-2.5
                            rounded-lg
                            px-2.5
                            py-2
                            text-left
                            transition

                            ${
                              activa
                                ? "bg-blue-600/20 text-white"
                                : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }
                          `}
                        >

                          {/* MINI LOGO */}

                          <div
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              overflow-hidden
                              rounded-lg
                              border
                              border-slate-600
                              bg-slate-900
                            "
                          >

                            {logo ? (
                              <img
                                src={logo}
                                alt={
                                  empresa.nombre_empresa
                                }
                                className="
                                  h-full
                                  w-full
                                  object-cover
                                "
                              />
                            ) : (
                              <Building2
                                size={15}
                                className="
                                  text-slate-400
                                "
                              />
                            )}

                          </div>


                          {/* NOMBRE */}

                          <div
                            className="
                              min-w-0
                              flex-1
                            "
                          >

                            <p
                              className="
                                truncate
                                text-xs
                                font-semibold
                              "
                            >
                              {
                                empresa.nombre_empresa
                              }
                            </p>


                            <p
                              className="
                                truncate
                                text-[10px]
                                text-slate-400
                              "
                            >
                              {
                                empresa.rol
                              }
                            </p>

                          </div>


                          {/* ACTIVA */}

                          {activa && (
                            <Check
                              size={16}
                              className="
                                shrink-0
                                text-blue-400
                              "
                            />
                          )}

                        </button>
                      );

                      
                    }
                  )}

                </div>
              )}

            </div>

          )}

        </div>

      </div>


      {/* ================================================= */}
      {/* NAVEGACIÓN */}
      {/* ================================================= */}

      <nav
        className="
          flex-1
          space-y-2
          overflow-y-auto
          p-4
        "
      >

        {modulos.map(
          (
            modulo
          ) => {

            const Icon =
              iconMap[
                modulo.icono
              ] ||
              FileText;


            return (
              <NavLink
                key={
                  modulo.id_modulo
                }
                to={
                  modulo.ruta
                }
                onClick={
                  onNavigate
                }
                className={
                  linkClass
                }
              >

                <Icon
                  size={19}
                />

                <span
                  className="
                    truncate
                  "
                >
                  {getModuleLabel(
                    modulo
                  )}
                </span>

              </NavLink>
            );
          }
        )}


        {/* PERFIL */}

        <NavLink
          to="/perfil"
          onClick={
            onNavigate
          }
          className={
            linkClass
          }
        >

          <UserRound
            size={19}
          />

          <span>
            {t(
              "user_profile"
            )}
          </span>

        </NavLink>

      </nav>

    </aside>
  );
}