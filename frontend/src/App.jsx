import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Roles from "./pages/Roles";
import Empresas from "./pages/Empresas";
import Usuarios from "./pages/Usuarios";
import PerfilEmpresa from "./pages/PerfilEmpresa";
import PerfilUsuario from "./pages/PerfilUsuario";
import Logs from "./pages/Logs";
import Error403 from "./pages/Error403";
import Error404 from "./pages/Error404";

import PrivateRoute from "./router/PrivateRoute";
import PermissionRoute from "./router/PermissionRoute";

import Clientes from "./pages/Clientes";
import Dumpsters from "./pages/Dumpsters";
import Camiones from "./pages/Camiones";
import Rentas from "./pages/Rentas";

import CompanySettings from "./pages/CompanySettings";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <PermissionRoute permission="dashboard.ver">
              <Dashboard />
            </PermissionRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <PrivateRoute>
              <PerfilUsuario />
            </PrivateRoute>
          }
        />

        <Route
          path="/perfil-empresa"
          element={
            <PermissionRoute permission="perfil_empresa.ver">
              <PerfilEmpresa />
            </PermissionRoute>
          }
        />

        <Route
          path="/empresas"
          element={
            <PermissionRoute permission="empresas.ver">
              <Empresas />
            </PermissionRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <PermissionRoute permission="usuarios.ver">
              <Usuarios />
            </PermissionRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <PermissionRoute permission="roles.ver">
              <Roles />
            </PermissionRoute>
          }
        />

        <Route
          path="/logs"
          element={
            <PermissionRoute permission="logs.ver">
              <Logs />
            </PermissionRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <PermissionRoute permission="clientes.ver">
              <Clientes />
            </PermissionRoute>
          }
        />

        <Route
          path="/dumpsters"
          element={
            <PermissionRoute permission="dumpsters.ver">
              <Dumpsters />
            </PermissionRoute>
          }
        />

        <Route
          path="/camiones"
          element={
            <PermissionRoute permission="camiones.ver">
              <Camiones />
            </PermissionRoute>
          }
        />

        <Route
          path="/rentas"
          element={
            <PermissionRoute permission="rentas.ver">
              <Rentas />
            </PermissionRoute>
          }
          />

        <Route path="/company-settings" element={<CompanySettings />} />  




        <Route path="/403" element={<Error403 />} />
        <Route path="*" element={<Error404 />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;