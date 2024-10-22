const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a MongoDB Atlas'))
    .catch(err => console.error('Error de conexión:', err));

// Rutas
const userRoutes = require('./routes/user');
const teamRoutes = require('./routes/team');
const matchRoutes = require('./routes/match');
const playerRoutes = require('./routes/player');
const mapRoutes = require('./routes/map');
const agentRoutes = require('./routes/agent');
const comparisonRoutes = require('./routes/comparison'); // Añadido

app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/comparisons', comparisonRoutes); // Añadido

// Ruta principal
app.get('/', (req, res) => {
    res.send('¡Hola, mundo desde Node.js y Express!');
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
