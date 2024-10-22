const mongoose = require('mongoose');

const PlayerStatsSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    assists: { type: Number, default: 0 }
}, { _id: false });

const MapSchema = new mongoose.Schema({
    map: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', required: true },
    team1Score: { type: Number, default: 0 },
    team2Score: { type: Number, default: 0 },
    stats: [PlayerStatsSchema]
}, { _id: false });

const MatchSchema = new mongoose.Schema({
    team1: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    team2: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    scores: {
        team1Score: { type: Number, default: 0 },
        team2Score: { type: Number, default: 0 }
    },
    maps: [MapSchema],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
}, { timestamps: true });

module.exports = mongoose.model('Match', MatchSchema);
