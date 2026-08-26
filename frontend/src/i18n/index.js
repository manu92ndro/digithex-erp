import i18n from "i18next";
import { initReactI18next } from "react-i18next";


// ======================================================
// ESPAÑOL
// ======================================================

import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
import esMenu from "./locales/es/menu.json";
import esUsers from "./locales/es/users.json";
import esCompanies from "./locales/es/companies.json";
import esRoles from "./locales/es/roles.json";
import esAudit from "./locales/es/audit.json";
import esClients from "./locales/es/clients.json";
import esDumpsters from "./locales/es/dumpsters.json";
import esTrucks from "./locales/es/trucks.json";
import esRentals from "./locales/es/rentals.json";
import esConstruction from "./locales/es/construction.json";
import esAgenda from "./locales/es/agenda.json";


// ======================================================
// INGLÉS
// ======================================================

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enMenu from "./locales/en/menu.json";
import enUsers from "./locales/en/users.json";
import enCompanies from "./locales/en/companies.json";
import enRoles from "./locales/en/roles.json";
import enAudit from "./locales/en/audit.json";
import enClients from "./locales/en/clients.json";
import enDumpsters from "./locales/en/dumpsters.json";
import enTrucks from "./locales/en/trucks.json";
import enRentals from "./locales/en/rentals.json";
import enConstruction from "./locales/en/construction.json";
import enAgenda from "./locales/en/agenda.json";


// ======================================================
// UNIR TRADUCCIONES
// ======================================================

const esTranslation = {
  ...esCommon,
  ...esAuth,
  ...esMenu,
  ...esUsers,
  ...esCompanies,
  ...esRoles,
  ...esAudit,
  ...esClients,
  ...esDumpsters,
  ...esTrucks,
  ...esRentals,
  ...esConstruction,
  ...esAgenda,
};


const enTranslation = {
  ...enCommon,
  ...enAuth,
  ...enMenu,
  ...enUsers,
  ...enCompanies,
  ...enRoles,
  ...enAudit,
  ...enClients,
  ...enDumpsters,
  ...enTrucks,
  ...enRentals,
  ...enConstruction,
  ...enAgenda,
};


// ======================================================
// IDIOMA GUARDADO
// ======================================================

const obtenerIdioma = () => {
  const idioma =
    localStorage.getItem("language") ||
    "es";

  const normalizado =
    String(idioma)
      .trim()
      .toLowerCase();

  if (
    normalizado === "en" ||
    normalizado.startsWith("en-")
  ) {
    return "en";
  }

  return "es";
};


// ======================================================
// CONFIGURACIÓN
// ======================================================

i18n
  .use(initReactI18next)
  .init({
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

    lng:
      obtenerIdioma(),

    fallbackLng:
      "es",

    defaultNS:
      "translation",

    interpolation: {
      escapeValue:
        false,
    },

    react: {
      useSuspense:
        false,
    },

    keySeparator:
      ".",
  });


// ======================================================
// DEBUG
// ======================================================

if (import.meta.env.DEV) {

  console.log(
    "I18N AGENDA TEST:"
  );

  console.log(
    i18n.t(
      "agenda.new.title"
    )
  );

  console.log(
    i18n.t(
      "agenda.job_type"
    )
  );

  console.log(
    i18n.exists(
      "agenda.new.title"
    )
  );
}


// ======================================================
// EXPORT
// ======================================================

export default i18n;