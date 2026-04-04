const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoute = require('./routes/authRoute')
const clientsRoute = require('./routes/clientsRoute')
const employeesRoute = require('./routes/employeesRoute')
const partRoute = require('./routes/partRoute')
const equipmentRoute = require('./routes/equipmentRoute')
const osRoute = require('./routes/osRoute')
const paymentRoute = require('./routes/paymentRoute')
const photoRoute = require('./routes/photoRoute')
const notificationRoute = require('./routes/notificationRoute')
const cargoRoute = require('./routes/cargoRoute')
const reportsRoute = require('./routes/reportsRoute');

const app = express()

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/auth', authRoute);
app.use('/clients', clientsRoute);
app.use('/employees', employeesRoute);
app.use('/part', partRoute);
app.use('/equipment', equipmentRoute);
app.use('/os', osRoute);
app.use('/payment', paymentRoute);
app.use('/photo', photoRoute);
app.use('/notification', notificationRoute);
app.use('/cargo', cargoRoute);
app.use('/reports', reportsRoute);

const PORT  = 5000

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
