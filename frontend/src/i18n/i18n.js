import i18n from "i18next";
import { initReactI18next } from "react-i18next";


// ======================================================
// ESPAÑOL
// ======================================================

import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
import esClients from "./locales/es/clients.json";
import esCompanies from "./locales/es/companies.json";
import esConstruction from "./locales/es/construction.json";
import esDumpsters from "./locales/es/dumpsters.json";
import esMenu from "./locales/es/menu.json";
import esRentals from "./locales/es/rentals.json";
import esRoles from "./locales/es/roles.json";
import esTrucks from "./locales/es/trucks.json";
import esUsers from "./locales/es/users.json";
import esAudit from "./locales/es/audit.json";
import esAgenda from "./locales/es/agenda.json";


// ======================================================
// INGLÉS
// ======================================================

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enClients from "./locales/en/clients.json";
import enCompanies from "./locales/en/companies.json";
import enConstruction from "./locales/en/construction.json";
import enDumpsters from "./locales/en/dumpsters.json";
import enMenu from "./locales/en/menu.json";
import enRentals from "./locales/en/rentals.json";
import enRoles from "./locales/en/roles.json";
import enTrucks from "./locales/en/trucks.json";
import enUsers from "./locales/en/users.json";
import enAudit from "./locales/en/audit.json";
import enAgenda from "./locales/en/agenda.json";


// ======================================================
// UNIR TRADUCCIONES
// ======================================================
//
// DigiThex utiliza un único namespace:
// "translation"
//
// Por eso los componentes deben usar:
//
// const { t } = useTranslation();
//
// Ejemplo:
//
// t("agenda.new.title")
//
// NO:
//
// useTranslation("agenda")
//
// ======================================================

const esTranslation = {
  ...esCommon,
  ...esAuth,
  ...esClients,
  ...esCompanies,
  ...esConstruction,
  ...esDumpsters,
  ...esMenu,
  ...esRentals,
  ...esRoles,
  ...esTrucks,
  ...esUsers,
  ...esAudit,
  ...esAgenda,
};


const enTranslation = {
  ...enCommon,
  ...enAuth,
  ...enClients,
  ...enCompanies,
  ...enConstruction,
  ...enDumpsters,
  ...enMenu,
  ...enRentals,
  ...enRoles,
  ...enTrucks,
  ...enUsers,
  ...enAudit,
  ...enAgenda,
};


// ======================================================
// OBTENER IDIOMA GUARDADO
// ======================================================

const obtenerIdiomaGuardado = () => {
  try {
    const idioma =
      localStorage.getItem("language");

    if (!idioma) {
      return "es";
    }

    const idiomaNormalizado =
      String(idioma)
        .trim()
        .toLowerCase();

    // Permitir valores como:
    // es
    // es-EC
    // en
    // en-US

    if (
      idiomaNormalizado === "en" ||
      idiomaNormalizado.startsWith("en-")
    ) {
      return "en";
    }

    return "es";

  } catch (error) {
    console.error(
      "Error obteniendo idioma guardado:",
      error
    );

    return "es";
  }
};


const idiomaGuardado =
  obtenerIdiomaGuardado();


// ======================================================
// CONFIGURACIÓN I18NEXT
// ======================================================

i18n
  .use(initReactI18next)
  .init({

    // --------------------------------------------------
    // RECURSOS
    // --------------------------------------------------

    resources: {

      es: {
        translation:
          esTranslation,
      },

      en: {
        translation:
          enTranslation,
      },

    },


    // --------------------------------------------------
    // IDIOMA
    // --------------------------------------------------

    lng:
      idiomaGuardado,

    fallbackLng:
      "es",


    // --------------------------------------------------
    // NAMESPACE
    // --------------------------------------------------
    //
    // Todo DigiThex utiliza "translation".
    //
    // Esto permite:
    //
    // useTranslation()
    //
    // t("agenda.new.title")
    //
    // --------------------------------------------------

    defaultNS:
      "translation",

    ns: [
      "translation",
    ],


    // --------------------------------------------------
    // INTERPOLACIÓN
    // --------------------------------------------------

    interpolation: {
      escapeValue:
        false,
    },


    // --------------------------------------------------
    // REACT
    // --------------------------------------------------

    react: {
      useSuspense:
        false,
    },


    // --------------------------------------------------
    // CLAVES
    // --------------------------------------------------

    keySeparator:
      ".",

    nsSeparator:
      ":",

  });


// ======================================================
// DEBUG DE DESARROLLO
// ======================================================
//
// Esto nos permite detectar inmediatamente si Agenda
// fue cargada correctamente.
//
// Solo aparecerá durante desarrollo.
//
// ======================================================

if (import.meta.env.DEV) {

  console.log(
    "================================="
  );

  console.log(
    "I18N DIGITHEX"
  );

  console.log(
    "Idioma:",
    i18n.language
  );

  console.log(
    "agenda.title:",
    i18n.t(
      "agenda.title"
    )
  );

  console.log(
    "agenda.new.title:",
    i18n.t(
      "agenda.new.title"
    )
  );

  console.log(
    "agenda.job_type:",
    i18n.t(
      "agenda.job_type"
    )
  );

  console.log(
    "Existe agenda.title:",
    i18n.exists(
      "agenda.title"
    )
  );

  console.log(
    "Existe agenda.new.title:",
    i18n.exists(
      "agenda.new.title"
    )
  );

  console.log(
    "================================="
  );
}


// ======================================================
// EXPORT
// ======================================================

export default i18n;