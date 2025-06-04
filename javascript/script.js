import { updateAuthUI, getCurrentUser, createSession, updateUserData } from './auth.js';

const gamesContainer = document.getElementById('games-container');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchInput = document.querySelector('.search-txt');
const searchBtn = document.querySelector('.search-btn');
const searchResultsContainer = document.getElementById('search-results');
const navItems = document.querySelectorAll('#nav_list .nav-item a');
const tabContents = document.querySelectorAll('.tab-content');
const settingsLink = document.getElementById('settings-link');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.querySelector('.close-modal');
const avatarInput = document.getElementById('avatar-input');
const saveAvatarBtn = document.getElementById('save-avatar-btn');
const usernameInput = document.getElementById('username-input');
const saveUsernameBtn = document.getElementById('save-username-btn');
const fileNameSpan = document.querySelector('.custom-file-upload .file-name');
let searchTimeout;

document.addEventListener('DOMContentLoaded', function() {
    updateAuthUI();
    loadTopGames();
    setupEventListeners();
    setupGameActions();
});

function setupEventListeners() {
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) searchGames(query);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) searchGames(query);
        }
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        
        if (query) {
            searchTimeout = setTimeout(() => {
                showSearchSuggestions(query);
            }, 300);
        } else {
            if (searchResultsContainer) {
                searchResultsContainer.style.display = 'none';
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (searchResultsContainer && !e.target.closest('#search-box')) {
            searchResultsContainer.style.display = 'none';
        }
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });

    settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        settingsModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    saveAvatarBtn.addEventListener('click', () => {
        const file = avatarInput.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Por favor, selecione uma imagem válida', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const user = getCurrentUser();
                if (user) {
                    const avatarDataUrl = e.target.result;
                    updateUserData({
                        avatar: avatarDataUrl
                    });
                    document.getElementById('user-avatar').src = avatarDataUrl;
                    showToast('Foto de perfil atualizada!', 'success');
                    settingsModal.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        } else {
            showToast('Selecione uma imagem para atualizar o avatar', 'error');
        }
    });

    saveUsernameBtn.addEventListener('click', () => {
        const newUsername = usernameInput.value.trim();
        if (newUsername) {
            if (newUsername.length < 3) {
                showToast('O nome deve ter pelo menos 3 caracteres', 'error');
                return;
            }
            const user = getCurrentUser();
            if (user) {
                updateUserData({
                    username: newUsername
                });
                document.getElementById('username').textContent = newUsername.split(' ')[0];
                showToast('Nome atualizado!', 'success');
                settingsModal.style.display = 'none';
            }
        } else {
            showToast('Digite um nome válido', 'error');
        }
    });

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            fileNameSpan.parentElement.classList.add('has-file');
        } else {
            fileNameSpan.textContent = '';
            fileNameSpan.parentElement.classList.remove('has-file');
        }
    });
}

function setupGameActions() {
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.action-btn')) {
            const btn = e.target.closest('.action-btn');
            const gameCard = btn.closest('.game-card');
            const gameId = gameCard.dataset.appid;
            const action = btn.classList[1];

            if (!getCurrentUser()) {
                showToast('Faça login para usar esta função', 'error');
                return;
            }

            try {
                const success = await handleGameAction(action, gameId);
                if (success) {
                    showToast(`Jogo ${getActionMessage(action)}`, 'success');
                    btn.classList.toggle('active');
                    const user = getCurrentUser();
                    if (user) await loadUserGames(user.email);
                }
            } catch (error) {
                console.error('Erro na ação:', error);
                showToast('Erro ao processar ação', 'error');
            }
        }
    });
}

async function handleGameAction(action, gameId) {
    const user = getCurrentUser();
    if (!user) return false;

    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    userData[user.email] = userData[user.email] || {
        favorites: [],
        liked: [],
        disliked: [],
        later: []
    };

    const category = {
        favorite: 'favorites',
        like: 'liked',
        dislike: 'disliked',
        later: 'later'
    }[action];

    if (!userData[user.email][category].includes(gameId)) {
        userData[user.email][category].push(gameId);
    } else {
        userData[user.email][category] = userData[user.email][category].filter(id => id !== gameId);
    }

    localStorage.setItem('userData', JSON.stringify(userData));
    return true;
}

function getActionMessage(action) {
    const messages = {
        favorite: 'adicionado aos favoritos',
        like: 'curtido',
        dislike: 'marcado como não gostei',
        later: 'adicionado para jogar mais tarde'
    };
    return messages[action] || 'processado';
}

function createGameElement(game, category, gameId) {
    const gameElement = document.createElement('div');
    gameElement.className = 'profile-game-card';
    gameElement.dataset.appid = game.appid;
    
    gameElement.innerHTML = `
        ${category ? `<div class="remove-game" data-game-id="${gameId}" data-category="${category}">X</div>` : ''}
        <img src="${game.image || 'https://via.placeholder.com/184x69'}" 
             alt="${game.name}" 
             class="game-image"
             onerror="this.src='https://via.placeholder.com/184x69'">
        <div class="game-info">
            <h3 class="game-title">${game.name || 'Nome desconhecido'}</h3>
            <p class="game-price">Preço: ${game.price || 'N/A'}</p>
            <a href="https://store.steampowered.com/app/${game.appid}" 
               target="_blank" 
               class="game-link">Ver na Steam</a>
        </div>
    `;
    
    if (category) {
        const removeButton = gameElement.querySelector('.remove-game');
        removeButton.addEventListener('click', () => removeGame(gameId, category));
    }
    
    return gameElement;
}

function switchTab(tabId) {
    navItems.forEach(item => {
        item.parentElement.classList.toggle('active', item.dataset.tab === tabId);
    });
    
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
        content.classList.toggle('hidden', content.id !== `${tabId}-tab`);
        if (content.classList.contains('active')) {
            content.classList.add('fade-in');
        }
    });
}

async function loadTopGames() {
    try {
        showLoading();
        
        const response = await fetch('http://localhost:3000/api/top-games');
        
        if (!response.ok) throw new Error('Erro ao carregar jogos');
        
        const games = await response.json();
        gamesContainer.innerHTML = '';
        
        games.forEach(game => {
            const gameElement = createGameElement(game, null, null);
            gameElement.classList.add('game-card');
            gameElement.innerHTML = `
                <div class="game-rank">#${game.rank || 'N/A'}</div>
                <img src="${game.image || 'https://via.placeholder.com/184x69'}" 
                     alt="${game.name}" 
                     class="game-image"
                     onerror="this.src='https://via.placeholder.com/184x69'">
                <div class="game-details">
                    <h3 class="game-title">${game.name || 'Nome desconhecido'}</h3>
                    <p class="game-players">Jogadores ativos: ${game.players ? game.players.toLocaleString() : 'N/A'}</p>
                    <p class="game-price">Preço: ${game.price || 'N/A'}</p>
                    <p class="game-release">Lançamento: ${game.release_date || 'Desconhecido'}</p>
                </div>
                <div class="game-actions">
                    <button class="action-btn favorite" title="Favoritar">★</button>
                    <button class="action-btn like" title="Curtir">👍</button>
                    <button class="action-btn dislike" title="Não gostei">👎</button>
                    <button class="action-btn later" title="Jogar mais tarde">⏱️</button>
                    <a href="https://store.steampowered.com/app/${game.appid}" 
                       target="_blank" 
                       class="game-link">Ver na Steam</a>
                </div>
            `;
            gamesContainer.appendChild(gameElement);
        });
        
        const user = getCurrentUser();
        if (user) {
            const userData = JSON.parse(localStorage.getItem('userData'))?.[user.email] || {};
            document.querySelectorAll('.game-card').forEach(card => {
                const gameId = card.dataset.appid;
                const favoriteBtn = card.querySelector('.action-btn.favorite');
                const likeBtn = card.querySelector('.action-btn.like');
                const dislikeBtn = card.querySelector('.action-btn.dislike');
                const laterBtn = card.querySelector('.action-btn.later');
                
                favoriteBtn.classList.toggle('active', userData.favorites?.includes(gameId));
                likeBtn.classList.toggle('active', userData.liked?.includes(gameId));
                dislikeBtn.classList.toggle('active', userData.disliked?.includes(gameId));
                laterBtn.classList.toggle('active', userData.later?.includes(gameId));
            });
        }
    } catch (error) {
        showError('Erro ao carregar jogos. Tente recarregar.');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

async function loadUserGames(userEmail) {
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    const userGames = userData[userEmail] || {};
    
    const categories = [
        { key: 'favorites', tab: 'favorites-tab' },
        { key: 'later', tab: 'later-tab' }
    ];
    
    for (const category of categories) {
        const tab = document.getElementById(category.tab);
        if (!tab) continue;
        
        tab.innerHTML = '';
        
        if (!userGames[category.key]?.length) {
            tab.innerHTML = '<p class="empty-message">Nenhum jogo nesta categoria</p>';
            continue;
        }

        const gamesContainer = document.createElement('div');
        gamesContainer.className = 'games-grid';
        tab.appendChild(gamesContainer);
        
        const uniqueGames = [...new Set(userGames[category.key])];
        
        for (const gameId of uniqueGames) {
            try {
                const game = await fetchGameDetails(gameId);
                if (game) {
                    gamesContainer.appendChild(createGameElement(game, category.key, gameId));
                }
            } catch (error) {
                console.error(`Erro ao carregar jogo ${gameId}:`, error);
            }
        }
    }
}

async function searchGames(query) {
    try {
        showLoading();
        gamesContainer.innerHTML = '';
        hideSearchResults();
        
        const response = await fetch(`http://localhost:3000/api/search-games?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) throw new Error('Pesquisa falhou');
        
        const games = await response.json();
        
        if (games.length === 0) {
            gamesContainer.innerHTML = `<p class="no-results">Nenhum jogo encontrado para "${query}"</p>`;
        } else {
            games.forEach((game, index) => {
                const gameElement = createGameElement(game, null, null);
                gameElement.classList.add('game-card');
                gameElement.innerHTML = `
                    <div class="game-rank">#${index + 1}</div>
                    <img src="${game.image || 'https://via.placeholder.com/184x69'}" 
                         alt="${game.name}" 
                         class="game-image"
                         onerror="this.src='https://via.placeholder.com/184x69'">
                    <div class="game-details">
                        <h3 class="game-title">${game.name || 'Nome desconhecido'}</h3>
                        <p class="game-players">Jogadores ativos: ${game.players ? game.players.toLocaleString() : 'N/A'}</p>
                        <p class="game-price">Preço: ${game.price || 'N/A'}</p>
                        <p class="game-release">Lançamento: ${game.release_date || 'Desconhecido'}</p>
                    </div>
                    <div class="game-actions">
                        <button class="action-btn favorite" title="Favoritar">★</button>
                        <button class="action-btn like" title="Curtir">👍</button>
                        <button class="action-btn dislike" title="Não gostei">👎</button>
                        <button class="action-btn later" title="Jogar mais tarde">⏱️</button>
                        <a href="https://store.steampowered.com/app/${game.appid}" 
                           target="_blank" 
                           class="game-link">Ver na Steam</a>
                    </div>
                `;
                gamesContainer.appendChild(gameElement);
            });
        }
        
    } catch (error) {
        showError('Erro na pesquisa. Tente novamente.');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

async function showSearchSuggestions(query) {
    if (!searchResultsContainer || query.length < 2) {
        hideSearchResults();
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/search-suggestions?q=${encodeURIComponent(query)}`);
        const suggestions = await response.json();
        
        searchResultsContainer.innerHTML = '';
        
        if (suggestions.length > 0) {
            suggestions.forEach(game => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                
                const img = document.createElement('img');
                img.src = game.image || 'https://via.placeholder.com/30';
                img.alt = game.name;
                img.onerror = () => img.src = 'https://via.placeholder.com/30';
                
                const span = document.createElement('span');
                span.textContent = game.name;
                
                item.append(img, span);
                item.addEventListener('click', () => {
                    searchInput.value = game.name;
                    hideSearchResults();
                    searchGames(game.name);
                });
                
                searchResultsContainer.appendChild(item);
            });
            searchResultsContainer.style.display = 'block';
        } else {
            hideSearchResults();
        }
    } catch (error) {
        console.error('Erro nas sugestões:', error);
        hideSearchResults();
    }
}

async function fetchGameDetails(gameId) {
    try {
        const response = await fetch(`http://localhost:3000/api/game-details?id=${gameId}`);
        if (!response.ok) throw new Error('Jogo não encontrado');
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar jogo:', error);
        return {
            appid: gameId,
            name: `Jogo ${gameId}`,
            image: 'https://via.placeholder.com/300x150',
            price: 'N/A'
        };
    }
}

function removeGame(gameId, category) {
    const user = getCurrentUser();
    if (!user) return;

    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    if (userData[user.email] && userData[user.email][category]) {
        userData[user.email][category] = userData[user.email][category].filter(id => id !== gameId);
        localStorage.setItem('userData', JSON.stringify(userData));
        loadUserGames(user.email);
    }
}

function showLoading() {
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    errorMessage.style.display = 'block';
    errorMessage.querySelector('p').textContent = message;
}

function hideSearchResults() {
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function setupMenuToggle() {
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.getElementById('nav_list');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
        });
        
        navList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navList.classList.remove('active');
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!navList.contains(e.target) && !menuToggle.contains(e.target)) {
                navList.classList.remove('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', setupMenuToggle);

function setupResponsiveHeader() {
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.getElementById('nav_list');
    const searchBox = document.getElementById('search-box');
    const searchBtn = document.querySelector('.search-btn');

    if (menuToggle && navList) {
        let isMenuOpen = false;

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            isMenuOpen = !isMenuOpen;
            navList.classList.toggle('active', isMenuOpen);
        });

        navList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                navList.classList.remove('active');
                isMenuOpen = false;
            });
        });

        document.addEventListener('click', (e) => {
            if (isMenuOpen && !navList.contains(e.target) && !menuToggle.contains(e.target)) {
                navList.classList.remove('active');
                isMenuOpen = false;
            }
        });
    }

    if (searchBtn && searchBox) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            searchBox.classList.toggle('active');
            const searchInput = searchBox.querySelector('.search-txt');
            if (searchBox.classList.contains('active')) {
                searchInput.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchBox.contains(e.target) && !searchBtn.contains(e.target)) {
                searchBox.classList.remove('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', setupResponsiveHeader);