const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// Ruta para calcular el KDA ratio
const calculateKDA = (stats) => {
    const { kills, assists, deaths } = stats;
    return deaths === 0 ? kills + assists : (kills + assists) / deaths;
};

// Ruta para comparar estadísticas generales de dos jugadores
router.get('/compare-players', [auth], async (req, res) => {
    try {
        const { player1Id, player2Id } = req.query;

        const player1 = await Player.findById(player1Id);
        const player2 = await Player.findById(player2Id);

        if (!player1 || !player2) {
            return res.status(404).send('Uno o ambos jugadores no fueron encontrados');
        }

        const comparison = {
            player1: {
                id: player1._id,
                name: player1.name,
                stats: player1.stats,
                kda: calculateKDA(player1.stats)
            },
            player2: {
                id: player2._id,
                name: player2.name,
                stats: player2.stats,
                kda: calculateKDA(player2.stats)
            }
        };

        res.status(200).json(comparison);
    } catch (err) {
        res.status(400).send('Error al comparar jugadores: ' + err.message);
    }
});

// Ruta para obtener el mejor jugador con un agente específico
router.get('/best-player-agent', [auth], async (req, res) => {
    try {
        const { agentId } = req.query;

        const matches = await Match.find({ "maps.stats.agent": agentId })
            .populate('maps.stats.player', 'name')
            .populate('maps.stats.agent', 'name');

        const playerStats = {};

        matches.forEach(match => {
            match.maps.forEach(map => {
                map.stats.forEach(stat => {
                    if (stat.agent.equals(agentId)) {
                        if (!playerStats[stat.player._id]) {
                            playerStats[stat.player._id] = { kills: 0, deaths: 0, assists: 0, name: stat.player.name };
                        }
                        playerStats[stat.player._id].kills += stat.kills;
                        playerStats[stat.player._id].deaths += stat.deaths;
                        playerStats[stat.player._id].assists += stat.assists;
                    }
                });
            });
        });

        const bestPlayer = Object.values(playerStats).reduce((best, current) => {
            const bestKDA = calculateKDA(best);
            const currentKDA = calculateKDA(current);
            return currentKDA > bestKDA ? current : best;
        });

        if (bestPlayer) {
            bestPlayer.kda = parseFloat(calculateKDA(bestPlayer).toFixed(2));
        }

        res.status(200).json(bestPlayer || {});
    } catch (err) {
        res.status(400).send('Error al obtener el mejor jugador con el agente específico: ' + err.message);
    }
});


// Ruta para obtener el mejor jugador en un mapa específico
router.get('/best-player-map', [auth], async (req, res) => {
    try {
        const { mapId } = req.query;

        const matches = await Match.find({ "maps.map": mapId })
            .populate('maps.stats.player', 'name')
            .populate('maps.map', 'name');

        const playerStats = {};

        matches.forEach(match => {
            match.maps.forEach(map => {
                if (map.map.equals(mapId)) {
                    map.stats.forEach(stat => {
                        if (!playerStats[stat.player._id]) {
                            playerStats[stat.player._id] = { kills: 0, deaths: 0, assists: 0, name: stat.player.name };
                        }
                        playerStats[stat.player._id].kills += stat.kills;
                        playerStats[stat.player._id].deaths += stat.deaths;
                        playerStats[stat.player._id].assists += stat.assists;
                    });
                }
            });
        });

        const bestPlayer = Object.values(playerStats).reduce((best, current) => {
            const bestKDA = calculateKDA(best);
            const currentKDA = calculateKDA(current);
            return currentKDA > bestKDA ? current : best;
        });

        if (bestPlayer) {
            bestPlayer.kda = parseFloat(calculateKDA(bestPlayer).toFixed(2));
        }

        res.status(200).json(bestPlayer || {});
    } catch (err) {
        res.status(400).send('Error al obtener el mejor jugador en el mapa específico: ' + err.message);
    }
});


// Ruta para comparar estadísticas de dos equipos en un mapa específico
router.get('/compare-teams-map', [auth], async (req, res) => {
    try {
        const { team1Id, team2Id, mapId } = req.query;

        const matches = await Match.find({ "maps.map": mapId })
            .populate('team1', 'name')
            .populate('team2', 'name')
            .populate('maps.stats.player', 'name')
            .populate('maps.map', 'name');

        const teamStats = {
            team1: { kills: 0, deaths: 0, assists: 0 },
            team2: { kills: 0, deaths: 0, assists: 0 }
        };

        matches.forEach(match => {
            match.maps.forEach(map => {
                if (map.map.equals(mapId)) {
                    map.stats.forEach(stat => {
                        if (match.team1._id.equals(team1Id)) {
                            teamStats.team1.kills += stat.kills;
                            teamStats.team1.deaths += stat.deaths;
                            teamStats.team1.assists += stat.assists;
                        }
                        if (match.team2._id.equals(team2Id)) {
                            teamStats.team2.kills += stat.kills;
                            teamStats.team2.deaths += stat.deaths;
                            teamStats.team2.assists += stat.assists;
                        }
                    });
                }
            });
        });

        const avgKillsTeam1 = teamStats.team1.kills / matches.length;
        const avgKillsTeam2 = teamStats.team2.kills / matches.length;

        const kdaTeam1 = calculateKDA(teamStats.team1);
        const kdaTeam2 = calculateKDA(teamStats.team2);

        const comparisonResult = {
            team1: {
                stats: teamStats.team1,
                avgKills: avgKillsTeam1,
                kda: kdaTeam1
            },
            team2: {
                stats: teamStats.team2,
                avgKills: avgKillsTeam2,
                kda: kdaTeam2
            }
        };

        res.status(200).json(comparisonResult);
    } catch (err) {
        res.status(400).send('Error al comparar equipos en el mapa específico: ' + err.message);
    }
});

// Ruta para obtener el leaderboard de jugadores
router.get('/leaderboard', [auth], async (req, res) => {
    try {
        const players = await Player.find().lean();

        // Calcular el KDA ratio para cada jugador
        players.forEach(player => {
            player.stats.kda = calculateKDA(player.stats);
        });

        // Ordenar los jugadores por KDA ratio de forma descendente
        players.sort((a, b) => b.stats.kda - a.stats.kda);

        // Limitar a los 10 mejores jugadores
        const topPlayers = players.slice(0, 10);

        res.status(200).json(topPlayers);
    } catch (err) {
        res.status(400).send('Error al obtener el leaderboard: ' + err.message);
    }
});

// Ruta para obtener el leaderboard de equipos
router.get('/leaderboard-teams', [auth], async (req, res) => {
    try {
        const teams = await Team.find().sort({ "stats.wins": -1 }).limit(10);
        res.status(200).json(teams);
    } catch (err) {
        res.status(400).send('Error al obtener el leaderboard: ' + err.message);
    }
});

// Ruta para obtener la tendencia de rendimiento de un jugador
router.get('/player-performance-trend', [auth], async (req, res) => {
    try {
        const { playerId } = req.query;
        const matches = await Match.find({ "maps.stats.player": playerId })
            .populate('maps.stats.player', 'name')
            .populate('maps.stats.agent', 'name');

        const performanceTrend = matches.map(match => {
            const stats = match.maps.flatMap(map => map.stats).filter(stat => stat.player._id.equals(playerId));
            const totalKills = stats.reduce((acc, stat) => acc + stat.kills, 0);
            const totalDeaths = stats.reduce((acc, stat) => acc + stat.deaths, 0);
            const totalAssists = stats.reduce((acc, stat) => acc + stat.assists, 0);
            return {
                kills: totalKills,
                deaths: totalDeaths,
                assists: totalAssists,
                kda: calculateKDA({ kills: totalKills, deaths: totalDeaths, assists: totalAssists })
            };
        });

        res.status(200).json(performanceTrend);
    } catch (err) {
        res.status(400).send('Error al obtener la tendencia de rendimiento del jugador: ' + err.message);
    }
});

// Ruta para obtener los mejores agentes de un jugador
router.get('/player-best-agents', [auth], async (req, res) => {
    try {
        const { playerId } = req.query;
        const matches = await Match.find({ "maps.stats.player": playerId })
            .populate('maps.stats.player', 'name')
            .populate('maps.stats.agent', 'name');

        const agentPerformance = {};

        matches.forEach(match => {
            match.maps.forEach(map => {
                map.stats.forEach(stat => {
                    if (stat.player._id.equals(playerId)) {
                        if (!agentPerformance[stat.agent._id]) {
                            agentPerformance[stat.agent._id] = {
                                name: stat.agent.name,
                                kills: 0,
                                deaths: 0,
                                assists: 0,
                                matches: 0
                            };
                        }
                        agentPerformance[stat.agent._id].kills += stat.kills;
                        agentPerformance[stat.agent._id].deaths += stat.deaths;
                        agentPerformance[stat.agent._id].assists += stat.assists;
                        agentPerformance[stat.agent._id].matches += 1;
                    }
                });
            });
        });

        const bestAgents = Object.values(agentPerformance).map(agent => ({
            ...agent,
            kda: calculateKDA(agent)
        })).sort((a, b) => b.kda - a.kda);

        res.status(200).json(bestAgents);
    } catch (err) {
        res.status(400).send('Error al obtener los mejores agentes del jugador: ' + err.message);
    }
});

// Ruta para obtener el rendimiento de un equipo en los mapas
router.get('/team-map-performance', [auth], async (req, res) => {
    try {
        const { teamId } = req.query;
        const matches = await Match.find({
            $or: [{ team1: teamId }, { team2: teamId }]
        }).populate('maps.map', 'name');

        const mapPerformance = {};

        matches.forEach(match => {
            match.maps.forEach(map => {
                if (!mapPerformance[map.map._id]) {
                    mapPerformance[map.map._id] = {
                        name: map.map.name,
                        kills: 0,
                        deaths: 0,
                        assists: 0,
                        matches: 0
                    };
                }
                const stats = map.stats.filter(stat => {
                    return match.team1.equals(teamId) || match.team2.equals(teamId);
                });

                stats.forEach(stat => {
                    mapPerformance[map.map._id].kills += stat.kills;
                    mapPerformance[map.map._id].deaths += stat.deaths;
                    mapPerformance[map.map._id].assists += stat.assists;
                });
                mapPerformance[map.map._id].matches += 1;
            });
        });

        const performance = Object.values(mapPerformance).map(map => ({
            ...map,
            kda: calculateKDA(map)
        })).sort((a, b) => b.kda - a.kda);

        res.status(200).json(performance);
    } catch (err) {
        res.status(400).send('Error al obtener el rendimiento del equipo en los mapas: ' + err.message);
    }
});

module.exports = router;
