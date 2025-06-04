const TOKEN_KEY = 'playerlog_token';
const USER_KEY = 'playerlog_user';
const USER_DATA_KEY = 'playerlog_user_data';

export function createSession(userData) {
    try {
        if (!userData?.email) {
            return false;
        }

        const token = generateToken(userData.email);
        const userToStore = {
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar || '../../assets/image/avatar.png'
        };

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(userToStore));

        const allUserData = JSON.parse(localStorage.getItem(USER_DATA_KEY)) || {};
        if (!allUserData[userData.email]) {
            allUserData[userData.email] = {
                favorites: [],
                liked: [],
                disliked: [],
                later: [],
                comments: [],
                username: userData.name,
                avatar: userData.avatar || '../../assets/image/avatar.png'
            };
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(allUserData));
        }

        updateAuthUI();
        return true;
    } catch (error) {
        return false;
    }
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
}

export function isLoggedIn() {
    return validateToken(localStorage.getItem(TOKEN_KEY));
}

export function getCurrentUser() {
    try {
        if (isLoggedIn()) {
            const user = JSON.parse(localStorage.getItem(USER_KEY));
            const allUserData = JSON.parse(localStorage.getItem(USER_DATA_KEY)) || {};
            const userData = allUserData[user.email] || {};

            return {
                ...user,
                name: userData.username || user.name,
                avatar: userData.avatar || user.avatar || '../../assets/image/avatar.png'
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

export function getUserData() {
    try {
        const user = getCurrentUser();
        if (!user) return null;

        const allUserData = JSON.parse(localStorage.getItem(USER_DATA_KEY)) || {};
        return allUserData[user.email] || null;
    } catch (error) {
        return null;
    }
}

export function updateUserData(data) {
    try {
        const user = getCurrentUser();
        if (!user) return;

        const allUserData = JSON.parse(localStorage.getItem(USER_DATA_KEY)) || {};
        allUserData[user.email] = { ...allUserData[user.email], ...data };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(allUserData));

        const userToStore = {
            name: data.username || user.name,
            email: user.email,
            avatar: data.avatar || user.avatar || '../../assets/image/avatar.png'
        };
        localStorage.setItem(USER_KEY, JSON.stringify(userToStore));
    } catch (error) {
    }
}

function generateToken(email) {
    const now = new Date();
    return `pl-${btoa(email)}-${now.getTime()}`;
}

function validateToken(token) {
    if (!token) return false;

    try {
        const tokenParts = token.split('-');
        if (tokenParts.length < 3 || tokenParts[0] !== 'pl') {
            return false;
        }

        const tokenTime = parseInt(tokenParts[2]);
        return (Date.now() - tokenTime) < 604800000;
    } catch (error) {
        return false;
    }
}

export function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    
    if (!authButtons || !userProfile) return;

    if (isLoggedIn()) {
        authButtons.style.display = 'none';
        userProfile.style.display = 'flex';
        
        const user = getCurrentUser();
        const usernameElement = document.getElementById('username');
        const avatarElement = document.getElementById('user-avatar');

        if (usernameElement && user) {
            const displayName = user.name || user.email.split('@')[0];
            usernameElement.textContent = displayName.split(' ')[0];
        }
        
        if (avatarElement && user) {
            avatarElement.src = user.avatar || '../../assets/image/avatar.png';
            avatarElement.onerror = () => {
                avatarElement.src = '../../assets/image/avatar.png';
            };
        }
    } else {
        authButtons.style.display = 'flex';
        userProfile.style.display = 'none';
    }
}

function setupProfileDropdown() {
    const profile = document.getElementById('user-profile');
    const menu = document.querySelector('.user-profile-menu');
    
    if (profile && menu) {
        profile.addEventListener('click', (e) => {
            if (e.target.closest('#logout-btn') || e.target.closest('#logout-menu-btn')) {
                return;
            }
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (!profile.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutMenuBtn = document.getElementById('logout-menu-btn');
    
    const handleLogout = (e) => {
        e.preventDefault();
        clearSession();
        window.location.href = '../../index.html';
    };
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutMenuBtn) logoutMenuBtn.addEventListener('click', handleLogout);
}

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    setupLogout();
    setupProfileDropdown();
});