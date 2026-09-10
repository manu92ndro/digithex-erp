import i18n from "i18next";
import {
  initReactI18next,
} from "react-i18next";


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
import esGastos from "./locales/es/gastos.json";


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
import enGastos from "./locales/en/gastos.json";


// ======================================================
// TRADUCCIONES
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


  // ====================================================
  // GASTOS
  // ====================================================
  //
  // Se registra explícitamente.
  // Funciona tanto si gastos.json tiene:
  //
  // {
  //   "expenses": {...}
  // }
  //
  // como si tiene directamente:
  //
  // {
  //   "title": "...",
  //   ...
  // }
  //
  // ====================================================

  expenses:
    esGastos.expenses ||
    esGastos,
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


  // ====================================================
  // EXPENSES
  // ====================================================

  expenses:
    enGastos.expenses ||
    enGastos,
};


// ======================================================
// IDIOMA GUARDADO
// ======================================================

const obtenerIdiomaGuardado =
  () => {

    try {

      const idioma =
        localStorage.getItem(
          "language"
        );


      if (!idioma) {
        return "es";
      }


      const normalizado =
        String(
          idioma
        )
          .trim()
          .toLowerCase();


      if (
        normalizado === "en" ||
        normalizado.startsWith(
          "en-"
        )
      ) {
        return "en";
      }


      return "es";


    } catch (error) {

      console.error(
        "Error obteniendo idioma:",
        error
      );


      return "es";
    }
  };


const idiomaGuardado =
  obtenerIdiomaGuardado();


// ======================================================
// INICIAR I18NEXT
// ======================================================

i18n
  .use(
    initReactI18next
  )
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
      idiomaGuardado,


    fallbackLng:
      "es",


    defaultNS:
      "translation",


    ns: [
      "translation",
    ],


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


    nsSeparator:
      ":",

  });



// ======================================================
// EXPORT
// ======================================================

export default i18n;