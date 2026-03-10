const express = require('express')
const cors = require('cors')
require('dotenv').config();
const clientsRoute = require('./routes/clientsRoute')
const app = express()

app.use(cors());
app.use(express.json());
app.use('/clients', clientsRoute);

const PORT  = 5000
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})