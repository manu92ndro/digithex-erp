import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// ==============================
// ESPAÑOL
// ==============================
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

// ==============================
// ENGLISH
// ==============================
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

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        translation: esTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },

    lng: localStorage.getItem("language") || "es",
    fallbackLng: "es",

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
