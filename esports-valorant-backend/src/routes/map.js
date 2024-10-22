const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Map = require('../models/Map');

// Crear mapa (solo admin)
router.post('/', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name } = req.body;
        const newMap = new Map({ name });
        await newMap.save();
        res.status(201).send('Mapa creado');
    } catch (err) {
        res.status(400).send('Error al crear mapa: ' + err.message);
    }
});

// Obtener todos los mapas (protegido)
router.get('/', auth, async (req, res) => {
    try {
        const maps = await Map.find();
        res.status(200).json(maps);
    } catch (err) {
        res.status(400).send('Error al obtener mapas: ' + err.message);
    }
});

// Actualizar un mapa (solo admin)
router.put('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { name } = req.body;
        const map = await Map.findByIdAndUpdate(req.params.id, { name }, { new: true });
        if (!map) return res.status(404).send('Mapa no encontrado');
        res.status(200).send('Mapa actualizado');
    } catch (err) {
        res.status(400).send('Error al actualizar mapa: ' + err.message);
    }
});

// Eliminar un mapa (solo admin)
router.delete('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const map = await Map.findByIdAndDelete(req.params.id);
        if (!map) return res.status(404).send('Mapa no encontrado');
        res.status(200).send('Mapa eliminado');
    } catch (err) {
        res.status(400).send('Error al eliminar mapa: ' + err.message);
    }
});

module.exports = router;
