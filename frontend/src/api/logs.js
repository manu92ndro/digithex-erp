import api from "./client";

export const getLogs = async (filters = {}) => {
  const response = await api.get("/logs", {
    params: filters
  });

  return response.data;
};

export const exportLogsExcel = async () => {
  const response = await api.get("/logs/export/excel", {
    responseType: "blob"
  });

  return response.data;
};