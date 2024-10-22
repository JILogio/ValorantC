const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Ruta de registro
router.post('/register', async (req, res) => {
    console.log('Solicitud de registro recibida:', req.body);
    try {
        const { username, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('El usuario ya está registrado.');
            return res.status(400).send('El usuario ya está registrado.');
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash la contraseña antes de guardarla
        const user = new User({ username, email, password: hashedPassword, role });
        await user.save();

        console.log('Usuario creado con éxito:', user);
        res.status(201).send({ message: 'Usuario creado con éxito' });
    } catch (err) {
        console.log('Error al registrar usuario:', err.message);
        res.status(400).send('Error al registrar usuario: ' + err.message);
    }
});

// Ruta de inicio de sesión
router.post('/login', async (req, res) => {
    console.log('Solicitud de inicio de sesión recibida:', req.body);
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Usuario no encontrado.');
            return res.status(400).send('Credenciales incorrectas.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Contraseña incorrecta.');
            return res.status(400).send('Credenciales incorrectas.');
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        console.log('Inicio de sesión exitoso, token:', token);
        res.status(200).send({ token, role: user.role });  // Incluye el rol en la respuesta
    } catch (err) {
        console.log('Error al iniciar sesión:', err.message);
        res.status(400).send('Error al iniciar sesión: ' + err.message);
    }
});

module.exports = router;
