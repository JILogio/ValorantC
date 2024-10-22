const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Calcular el ganador basado en el mejor de 3
function calculateWinner(match) {
    const team1Wins = match.maps.filter(map => map.team1Score > map.team2Score).length;
    const team2Wins = match.maps.filter(map => map.team2Score > map.team1Score).length;

    if (team1Wins > team2Wins) {
        match.winner = match.team1;
        match.scores.team1Score = team1Wins;
        match.scores.team2Score = team2Wins;
    } else {
        match.winner = match.team2;
        match.scores.team1Score = team1Wins;
        match.scores.team2Score = team2Wins;
    }
}

// Revertir estadísticas de equipos y jugadores
async function revertStatistics(match) {
    const team1 = await Team.findById(match.team1).populate('players');
    const team2 = await Team.findById(match.team2).populate('players');

    team1.stats.totalGames = Math.max(0, team1.stats.totalGames - 1);
    team2.stats.totalGames = Math.max(0, team2.stats.totalGames - 1);

    if (match.winner.equals(match.team1)) {
        team1.stats.wins = Math.max(0, team1.stats.wins - 1);
        team2.stats.losses = Math.max(0, team2.stats.losses - 1);
    } else {
        team1.stats.losses = Math.max(0, team1.stats.losses - 1);
        team2.stats.wins = Math.max(0, team2.stats.wins - 1);
    }

    for (const map of match.maps) {
        for (const playerStat of map.stats) {
            const player = await Player.findById(playerStat.player);
            if (player) {
                player.stats.kills = Math.max(0, player.stats.kills - playerStat.kills);
                player.stats.deaths = Math.max(0, player.stats.deaths - playerStat.deaths);
                player.stats.assists = Math.max(0, player.stats.assists - playerStat.assists);
                await player.save();
            }
        }
    }

    await team1.save();
    await team2.save();
}

// Actualizar estadísticas de equipos y jugadores
async function updateStatistics(match) {
    const team1 = await Team.findById(match.team1).populate('players');
    const team2 = await Team.findById(match.team2).populate('players');

    team1.stats.totalGames += 1;
    team2.stats.totalGames += 1;

    if (match.winner.equals(match.team1)) {
        team1.stats.wins += 1;
        team2.stats.losses += 1;
    } else {
        team1.stats.losses += 1;
        team2.stats.wins += 1;
    }

    for (const map of match.maps) {
        for (const playerStat of map.stats) {
            const player = await Player.findById(playerStat.player);
            if (player) {
                player.stats.kills += playerStat.kills;
                player.stats.deaths += playerStat.deaths;
                player.stats.assists += playerStat.assists;
                await player.save();
            }
        }
    }

    await team1.save();
    await team2.save();
}


// Crear partido (solo admin)
router.post('/', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { team1, team2, maps } = req.body;
        if (maps.length !== 3) {
            return res.status(400).send('Debe proporcionar exactamente 3 mapas.');
        }

        const team1Data = await Team.findById(team1).populate('players');
        const team2Data = await Team.findById(team2).populate('players');

        if (!team1Data || !team2Data) {
            return res.status(400).send('Los equipos proporcionados no son válidos.');
        }

        const newMaps = maps.map(map => ({
            map: map.mapId,  // Cambia de mapId a map
            team1Score: map.team1Score,
            team2Score: map.team2Score,
            stats: [
                ...team1Data.players.map(player => ({
                    player: player._id,
                    agent: map.stats[player._id]?.agent,
                    kills: map.stats[player._id]?.kills || 0,
                    deaths: map.stats[player._id]?.deaths || 0,
                    assists: map.stats[player._id]?.assists || 0
                })),
                ...team2Data.players.map(player => ({
                    player: player._id,
                    agent: map.stats[player._id]?.agent,
                    kills: map.stats[player._id]?.kills || 0,
                    deaths: map.stats[player._id]?.deaths || 0,
                    assists: map.stats[player._id]?.assists || 0
                }))
            ]
        }));

        const newMatch = new Match({ team1, team2, maps: newMaps });

        calculateWinner(newMatch);
        await newMatch.save();
        await updateStatistics(newMatch);

        const populatedMatch = await Match.findById(newMatch._id)
            .populate('team1', 'name')
            .populate('team2', 'name')
            .populate('winner', 'name')
            .populate('maps.map', 'name') // Asegúrate de poblar los nombres de los mapas
            .populate('maps.stats.player', 'name')
            .populate('maps.stats.agent', 'name'); // Añadir agente a la población

        res.status(201).json(populatedMatch);
    } catch (err) {
        console.error('Error creating match:', err);  // Log error details
        res.status(400).send('Error al crear partido: ' + err.message);
    }
});

// Obtener todos los partidos (protegido)
router.get('/', auth, async (req, res) => {
    try {
        const matches = await Match.find()
            .populate('team1 team2', 'name')
            .populate('winner', 'name')
            .populate('maps.map', 'name') // Asegúrate de poblar los nombres de los mapas
            .populate('maps.stats.player', 'name')
            .populate('maps.stats.agent', 'name'); // Añadir agente a la población
        res.status(200).json(matches);
    } catch (err) {
        res.status(400).send('Error al obtener partidos: ' + err.message);
    }
});

// Obtener un partido por ID (protegido)
router.get('/:id', auth, async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('team1 team2', 'name')
            .populate('winner', 'name')
            .populate('maps.map', 'name') // Asegúrate de poblar los nombres de los mapas
            .populate('maps.stats.player', 'name')
            .populate('maps.stats.agent', 'name'); // Añadir agente a la población
        if (!match) return res.status(404).send('Partido no encontrado');
        res.status(200).json(match);
    } catch (err) {
        res.status(400).send('Error al obtener partido: ' + err.message);
    }
});

// Actualizar un partido (solo admin)
router.put('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const { team1, team2, maps } = req.body;
        if (maps.length !== 3) {
            return res.status(400).send('Debe proporcionar exactamente 3 mapas.');
        }

        const match = await Match.findById(req.params.id);

        if (!match) return res.status(404).send('Partido no encontrado');

        // Revertir las estadísticas antes de actualizar el partido
        await revertStatistics(match);

        const team1Data = await Team.findById(team1).populate('players');
        const team2Data = await Team.findById(team2).populate('players');

        if (!team1Data || !team2Data) {
            return res.status(400).send('Los equipos proporcionados no son válidos.');
        }

        match.team1 = team1;
        match.team2 = team2;
        match.maps = maps.map(map => ({
            map: map.mapId,  // Asegúrate de que `map` está siendo asignado correctamente
            team1Score: map.team1Score,
            team2Score: map.team2Score,
            stats: [
                ...team1Data.players.map(player => ({
                    player: player._id,
                    agent: map.stats[player._id]?.agent,
                    kills: map.stats[player._id]?.kills || 0,
                    deaths: map.stats[player._id]?.deaths || 0,
                    assists: map.stats[player._id]?.assists || 0
                })),
                ...team2Data.players.map(player => ({
                    player: player._id,
                    agent: map.stats[player._id]?.agent,
                    kills: map.stats[player._id]?.kills || 0,
                    deaths: map.stats[player._id]?.deaths || 0,
                    assists: map.stats[player._id]?.assists || 0
                }))
            ]
        }));

        calculateWinner(match);
        await match.save();
        await updateStatistics(match);

        const populatedMatch = await Match.findById(match._id)
            .populate('team1', 'name')
            .populate('team2', 'name')
            .populate('winner', 'name')
            .populate('maps.map', 'name') // Asegúrate de poblar los nombres de los mapas
            .populate('maps.stats.player', 'name')
            .populate('maps.stats.agent', 'name'); // Añadir agente a la población

        res.status(200).json(populatedMatch);
    } catch (err) {
        res.status(400).send('Error al actualizar partido: ' + err.message);
    }
});

// Eliminar un partido (solo admin)
router.delete('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).send('Partido no encontrado');

        // Revertir las estadísticas antes de eliminar el partido
        await revertStatistics(match);

        await Match.findByIdAndDelete(req.params.id);
        
        res.status(200).send('Partido eliminado');
    } catch (err) {
        res.status(400).send('Error al eliminar partido: ' + err.message);
    }
});

module.exports = router;
