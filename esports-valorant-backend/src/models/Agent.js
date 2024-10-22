// src/models/Agent.js
const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    icon: { type: String, required: true },  // URL or path to the agent's icon
}, { timestamps: true });

module.exports = mongoose.model('Agent', AgentSchema);
