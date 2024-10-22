// src/routes/agent.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Agent = require('../models/Agent');

// Crear agente (solo admin)
router.post('/', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name, icon } = req.body;
        const newAgent = new Agent({ name, icon });
        await newAgent.save();
        res.status(201).send('Agente creado');
    } catch (err) {
        res.status(400).send('Error al crear agente: ' + err.message);
    }
});

// Obtener todos los agentes
router.get('/', auth, async (req, res) => {
    try {
        const agents = await Agent.find();
        res.status(200).json(agents);
    } catch (err) {
        res.status(400).send('Error al obtener agentes: ' + err.message);
    }
});

// Actualizar un agente (solo admin)
router.put('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name, icon } = req.body;
        const agent = await Agent.findByIdAndUpdate(req.params.id, { name, icon }, { new: true });
        if (!agent) return res.status(404).send('Agente no encontrado');
        res.status(200).send('Agente actualizado');
    } catch (err) {
        res.status(400).send('Error al actualizar agente: ' + err.message);
    }
});

// Eliminar un agente (solo admin)
router.delete('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const agent = await Agent.findByIdAndDelete(req.params.id);
        if (!agent) return res.status(404).send('Agente no encontrado');
        res.status(200).send('Agente eliminado');
    } catch (err) {
        res.status(400).send('Error al eliminar agente: ' + err.message);
    }
});

module.exports = router;
