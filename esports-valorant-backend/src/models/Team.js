const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        totalGames: { type: Number, default: 0 },
        pointsScored: { type: Number, default: 0 },
        pointsConceded: { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('Team', TeamSchema);
