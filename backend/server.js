const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const cache = {
    topGames: null,
    lastUpdated: null
};

const getSteamImage = (appid, type = 'header') => {
    const baseUrl = 'https://cdn.cloudflare.steamstatic.com/steam/apps';
    const sizes = {
        header: 'header.jpg',
        capsule: 'capsule_184x69.jpg',
        library: 'library_600x900.jpg'
    };
    return `${baseUrl}/${appid}/${sizes[type]}`;
};

app.get('/api/top-games', async (req, res) => {
    try {
        if (cache.topGames && cache.lastUpdated && (Date.now() - cache.lastUpdated) < 1800000) {
            return res.json(cache.topGames);
        }

        const playersResponse = await axios.get(
            'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/'
        );

        let topGames = playersResponse.data?.response?.ranks || [];

        if (topGames.length === 0) {
            const appsResponse = await axios.get(
                'https://api.steampowered.com/ISteamApps/GetAppList/v2/'
            );
            topGames = appsResponse.data.applist.apps
                .slice(0, 200)
                .map((app, index) => ({
                    rank: index + 1,
                    appid: app.appid,
                    name: app.name
                }));
        }

        const gamesWithDetails = await Promise.all(
            topGames.slice(0, 50).map(async (game) => {
                try {
                    const detailResponse = await axios.get(
                        `https://store.steampowered.com/api/appdetails?appids=${game.appid}&cc=br&l=portuguese`
                    );

                    const details = detailResponse.data[game.appid]?.data || {};
                    const price = details.price_overview ? 
                        `R$ ${(details.price_overview.final / 100).toFixed(2)}` : 
                        'Grátis';

                    return {
                        rank: game.rank,
                        appid: game.appid,
                        name: game.name || details.name || 'Nome desconhecido',
                        players: game.players || 0,
                        image: details.header_image || getSteamImage(game.appid),
                        price,
                        release_date: details.release_date?.date || 'Desconhecido'
                    };
                } catch (error) {
                    return {
                        ...game,
                        image: getSteamImage(game.appid),
                        price: 'Desconhecido',
                        release_date: 'Desconhecido',
                        players: 0
                    };
                }
            })
        );

        cache.topGames = gamesWithDetails;
        cache.lastUpdated = Date.now();

        res.json(gamesWithDetails);
    } catch (error) {
        console.error('Erro ao buscar jogos populares:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar jogos',
            details: error.message 
        });
    }
});

app.get('/api/search-games', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase();
        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Termo de pesquisa inválido' });
        }

        const appsResponse = await axios.get(
            'https://api.steampowered.com/ISteamApps/GetAppList/v2/'
        );

        const matchingGames = appsResponse.data.applist.apps
            .filter(app => app.name && app.name.toLowerCase().includes(query))
            .sort((a, b) => {
                const aStartsWith = a.name.toLowerCase().startsWith(query);
                const bStartsWith = b.name.toLowerCase().startsWith(query);
                
                if (aStartsWith !== bStartsWith) {
                    return aStartsWith ? -1 : 1;
                }
                
                const lengthDiff = a.name.length - b.name.length;
                if (lengthDiff !== 0) return lengthDiff;
                
                return a.name.localeCompare(b.name);
            })
            .slice(0, 20);

        const gamesWithDetails = await Promise.all(
            matchingGames.map(async (game) => {
                try {
                    const detailResponse = await axios.get(
                        `https://store.steampowered.com/api/appdetails?appids=${game.appid}&cc=br&l=portuguese`
                    );

                    const details = detailResponse.data[game.appid]?.data || {};
                    const price = details.price_overview ? 
                        `R$ ${(details.price_overview.final / 100).toFixed(2)}` : 
                        'Grátis';

                    return {
                        appid: game.appid,
                        name: game.name,
                        image: details.header_image || getSteamImage(game.appid),
                        price,
                        release_date: details.release_date?.date || 'Desconhecido',
                        players: 0
                    };
                } catch (error) {
                    return {
                        appid: game.appid,
                        name: game.name,
                        image: getSteamImage(game.appid),
                        price: 'Desconhecido',
                        release_date: 'Desconhecido',
                        players: 0
                    };
                }
            })
        );

        res.json(gamesWithDetails);
    } catch (error) {
        console.error('Erro na pesquisa:', error);
        res.status(500).json({ 
            error: 'Erro ao pesquisar jogos',
            details: error.message 
        });
    }
});

app.get('/api/search-suggestions', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase();
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const appsResponse = await axios.get(
            'https://api.steampowered.com/ISteamApps/GetAppList/v2/'
        );

        const suggestions = appsResponse.data.applist.apps
            .filter(app => app.name && app.name.toLowerCase().includes(query))
            .sort((a, b) => {
                const aStartsWith = a.name.toLowerCase().startsWith(query);
                const bStartsWith = b.name.toLowerCase().startsWith(query);
                if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1;
                return a.name.length - b.name.length;
            })
            .slice(0, 8)
            .map(app => ({
                appid: app.appid,
                name: app.name,
                image: getSteamImage(app.appid, 'capsule')
            }));

        res.json(suggestions);
    } catch (error) {
        console.error('Erro nas sugestões:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar sugestões',
            details: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'online' });
});

app.get('/api/game-details', async (req, res) => {
    try {
        const appid = req.query.id;
        const response = await axios.get(
            `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=br&l=portuguese`
        );
        
        const data = response.data[appid]?.data;
        if (!data) return res.status(404).json({ error: 'Jogo não encontrado' });

        res.json({
            appid,
            name: data.name,
            image: data.header_image,
            price: data.price_overview ? `R$ ${(data.price_overview.final / 100).toFixed(2)}` : 'Grátis'
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar jogo' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});