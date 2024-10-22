const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Team = require('../models/Team');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Crear jugador (solo admin)
router.post('/', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name, team } = req.body;
        const player = new Player({ name, team });
        await player.save();

        if (team) {
            const teamDoc = await Team.findById(team);
            if (teamDoc) {
                teamDoc.players.push(player._id);
                await teamDoc.save();
            }
        }

        const newPlayer = await Player.findById(player._id).populate('team', 'name');
        res.status(201).json(newPlayer);
    } catch (err) {
        res.status(400).send('Error al crear jugador: ' + err.message);
    }
});

// Restablecer estadísticas de todos los jugadores (solo admin)
router.post('/reset-stats', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        await Player.updateMany({}, {
            $set: {
                "stats.kills": 0,
                "stats.deaths": 0,
                "stats.assists": 0
            }
        });
        res.status(200).send('Estadísticas de todos los jugadores restablecidas');
    } catch (err) {
        res.status(400).send('Error al restablecer estadísticas: ' + err.message);
    }
});


// Obtener todos los jugadores (protegido)
router.get('/', auth, async (req, res) => {
    try {
        const players = await Player.find().populate('team', 'name');
        res.status(200).json(players);
    } catch (err) {
        res.status(400).send('Error al obtener jugadores: ' + err.message);
    }
});

// Obtener un jugador por ID (protegido)
router.get('/:id', auth, async (req, res) => {
    try {
        const player = await Player.findById(req.params.id).populate('team', 'name');
        if (!player) return res.status(404).send('Jugador no encontrado');
        res.status(200).json(player);
    } catch (err) {
        res.status(400).send('Error al obtener jugador: ' + err.message);
    }
});

// Actualizar un jugador (solo admin)
router.put('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name, team } = req.body;
        const player = await Player.findById(req.params.id);
        
        if (!player) return res.status(404).send('Jugador no encontrado');

        // Verifica si el jugador tiene un equipo diferente
        if (player.team && player.team.toString() !== team) {
            // Elimina al jugador del equipo anterior
            const oldTeam = await Team.findById(player.team);
            if (oldTeam) {
                oldTeam.players.pull(player._id);
                await oldTeam.save();
            }
        }

        // Actualiza el equipo del jugador
        player.name = name;
        player.team = team;
        await player.save();

        // Agrega al jugador al nuevo equipo
        const newTeam = await Team.findById(team);
        if (newTeam && !newTeam.players.includes(player._id)) {
            newTeam.players.push(player._id);
            await newTeam.save();
        }

        res.status(200).json(player);
    } catch (err) {
        res.status(400).send('Error al actualizar jugador: ' + err.message);
    }
});


// Eliminar un jugador (solo admin)
router.delete('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const player = await Player.findByIdAndDelete(req.params.id);
        if (!player) return res.status(404).send('Jugador no encontrado');

        const team = await Team.findById(player.team);
        if (team) {
            team.players.pull(player._id);
            await team.save();
        }

        res.status(200).send('Jugador eliminado');
    } catch (err) {
        res.status(400).send('Error al eliminar jugador: ' + err.message);
    }
});

module.exports = router;
