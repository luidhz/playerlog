import { getCurrentUser, updateUserData } from '../../javascript/auth.js';

const profileAvatar = document.getElementById('profile-avatar');
const profileUsername = document.getElementById('profile-username');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "../../pages/login/login.html";
        return;
    }

    loadUserProfile(user);
    setupEventListeners();
    await loadUserGames(user.email);
    switchTab('favorites');
});

function loadUserProfile(user) {
    profileUsername.textContent = user.name;
    profileAvatar.src = user.avatar || '../../assets/image/avatar.png';
    profileAvatar.onerror = () => {
        profileAvatar.src = '../../assets/image/avatar.png';
    };
}

function setupEventListeners() {
    const editAvatarButton = document.querySelector('.edit-avatar');
    editAvatarButton?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    showToast('Por favor, selecione uma imagem válida', 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const avatarDataUrl = e.target.result;
                    const user = getCurrentUser();
                    if (user) {
                        updateUserData({
                            avatar: avatarDataUrl
                        });
                        profileAvatar.src = avatarDataUrl;
                        const headerAvatar = document.getElementById('user-avatar');
                        if (headerAvatar) {
                            headerAvatar.src = avatarDataUrl;
                        }
                        showToast('Foto de perfil atualizada!', 'success');
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
}

function switchTab(tabId) {
    tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
    
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
        if (content.classList.contains('active')) {
            content.classList.add('fade-in');
        }
    });
}

async function loadUserGames(userEmail) {
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    const userGames = userData[userEmail] || {};
    
    const categories = [
        { key: 'favorites', tab: 'favorites-tab' },
        { key: 'liked', tab: 'liked-tab' },
        { key: 'disliked', tab: 'disliked-tab' },
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

function createGameElement(game, category, gameId) {
    const gameElement = document.createElement('div');
    gameElement.className = 'profile-game-card';
    
    gameElement.innerHTML = `
        <div class="remove-game" data-game-id="${gameId}" data-category="${category}">X</div>
        <img src="${game.image}" 
             alt="${game.name}" 
             class="game-image"
             onerror="this.src='https://via.placeholder.com/300x150'">
        <div class="game-info">
            <h3 class="game-title">${game.name}</h3>
            <p class="game-price">${game.price}</p>
            <a href="https://store.steampowered.com/app/${game.appid}" 
               target="_blank" 
               class="game-link">Ver na Steam</a>
        </div>
    `;
    
    const removeButton = gameElement.querySelector('.remove-game');
    removeButton.addEventListener('click', () => removeGame(gameId, category));
    
    return gameElement;
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

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}