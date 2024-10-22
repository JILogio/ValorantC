const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Crear equipo (solo admin)
router.post('/', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name, players } = req.body;
        const newTeam = new Team({ name, players });
        await newTeam.save();
        res.status(201).send('Equipo creado');
    } catch (err) {
        res.status(400).send('Error al crear equipo: ' + err.message);
    }
});

// Obtener todos los equipos (protegido)
router.get('/', auth, async (req, res) => {
    try {
        const teams = await Team.find().populate('players', 'name stats');
        res.status(200).json(teams);
    } catch (err) {
        res.status(400).send('Error al obtener equipos: ' + err.message);
    }
});

// Obtener un equipo por ID (protegido)
router.get('/:id', auth, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).populate('players', 'name stats');
        if (!team) return res.status(404).send('Equipo no encontrado');
        res.status(200).json(team);
    } catch (err) {
        res.status(400).send('Error al obtener equipo: ' + err.message);
    }
});

// Actualizar un equipo (solo admin)
router.put('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name, players, stats } = req.body;
        const team = await Team.findByIdAndUpdate(req.params.id, { name, players, stats }, { new: true });
        if (!team) return res.status(404).send('Equipo no encontrado');
        res.status(200).send('Equipo actualizado');
    } catch (err) {
        res.status(400).send('Error al actualizar equipo: ' + err.message);
    }
});

// Eliminar un equipo (solo admin)
router.delete('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const team = await Team.findByIdAndDelete(req.params.id);
        if (!team) return res.status(404).send('Equipo no encontrado');
        res.status(200).send('Equipo eliminado');
    } catch (err) {
        res.status(400).send('Error al eliminar equipo: ' + err.message);
    }
});

module.exports = router;
