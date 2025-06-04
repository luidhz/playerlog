import { createSession } from '../../javascript/auth.js';

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const toast = document.querySelector('.toast');
const eyeIcon = document.querySelector('.eye-open');

document.addEventListener('DOMContentLoaded', () => {
    const cookies = document.cookie.split('; ').find(row => row.startsWith('userEmail='));
    if (cookies) {
        emailInput.value = cookies.split('=')[1];
        rememberCheckbox.checked = true;
    }

    setupEventListeners();
});

function setupEventListeners() {
    if (eyeIcon) {
        eyeIcon.addEventListener('click', togglePasswordVisibility);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

function togglePasswordVisibility() {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    const basePath = '../../assets/image/';
    eyeIcon.src = isPassword 
        ? `${basePath}icon-eye-open.svg` 
        : `${basePath}icon-eye-closed.svg`;
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showToast('Preencha todos os campos', 'error');
        return;
    }

    try {
        const users = JSON.parse(localStorage.getItem('listUser')) || [];
        const user = users.find(u => u.email === email);

        if (!user) {
            showToast('Usuário não encontrado', 'error');
            return;
        }

        if (user.password !== password) {
            showToast('Senha incorreta', 'error');
            return;
        }

        createSession({
            name: user.name,
            email: user.email,
            avatar: user.avatar
        });

        if (rememberCheckbox.checked) {
            document.cookie = `userEmail=${email}; max-age=${30 * 24 * 60 * 60}; path=/`;
        }

        showToast('Login realizado com sucesso!', 'success');
        
        setTimeout(() => {
            window.location.href = "../../index.html";
        }, 1500);

    } catch (error) {
        console.error("Erro no login:", error);
        showToast('Erro durante o login', 'error');
    }
}

function showToast(message, type) {
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}