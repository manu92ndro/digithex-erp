const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();


app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://app.domthex.com"
    ],
    credentials: true
}));

app.use(express.json());
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'src/uploads'))
);

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'API DigiThex ERP funcionando'
  });
});

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/dashboard', require('./src/routes/dashboard.routes'));
app.use('/api/usuarios', require('./src/routes/usuarios.routes'));
app.use('/api/roles', require('./src/routes/roles.routes'));
app.use('/api/empresas', require('./src/routes/empresas.routes'));
app.use('/api/logs', require('./src/routes/logs.routes'));
app.use('/api/permisos', require('./src/routes/permisos.routes'));

app.use('/api/clientes', require('./src/routes/clientes.routes'));
app.use('/api/dumpsters', require('./src/routes/dumpsters.routes'));
app.use('/api/camiones', require('./src/routes/camiones.routes'));
app.use('/api/rentas', require('./src/routes/rentas.routes'));


module.exports = app;