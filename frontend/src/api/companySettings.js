import api from "./client";

export const getCompanySettings = async () => {
  const { data } = await api.get("/company-settings");
  return data;
};

export const updateCompanySettings = async (payload) => {
  const { data } = await api.put("/company-settings", payload);
  return data;
};

export const uploadCompanyQR = async (file) => {
  const formData = new FormData();
  formData.append("qr", file);

  const { data } = await api.post("/company-settings/qr", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};


export const testCompanyEmail = async () => {
  const { data } = await api.post("/company-settings/email/test");
  return data;
};