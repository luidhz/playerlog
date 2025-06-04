const signupForm = document.getElementById('signup-form');
const toast = document.querySelector('.toast');
const elements = {
    name: {
        input: document.getElementById('name'),
        label: document.querySelector('label[for="name"]'),
        valid: false
    },
    email: {
        input: document.getElementById('email'),
        label: document.querySelector('label[for="email"]'),
        valid: false,
        hint: document.createElement('small')
    },
    password: {
        input: document.getElementById('password'),
        label: document.querySelector('label[for="password"]'),
        valid: false,
        eyeIcon: document.querySelector('.eye-open')
    },
    confirmPassword: {
        input: document.getElementById('confirmPassword'),
        label: document.querySelector('label[for="confirmPassword"]'),
        valid: false,
        eyeIcon: document.querySelector('.eye-open-confirm'),
        hint: document.createElement('small')
    }
};

document.addEventListener('DOMContentLoaded', () => {
    elements.email.hint.className = 'hint';
    elements.email.input.parentNode.appendChild(elements.email.hint);
    elements.confirmPassword.hint.className = 'hint';
    elements.confirmPassword.input.parentNode.appendChild(elements.confirmPassword.hint);

    setupPasswordToggles();
    setupEventListeners();
});

function setupPasswordToggles() {
    elements.password.eyeIcon.addEventListener('click', () => {
        togglePasswordVisibility(elements.password.input, elements.password.eyeIcon);
    });

    elements.confirmPassword.eyeIcon.addEventListener('click', () => {
        togglePasswordVisibility(elements.confirmPassword.input, elements.confirmPassword.eyeIcon);
    });
}

function togglePasswordVisibility(input, icon) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    const basePath = '../../assets/image/';
    icon.src = isPassword 
        ? `${basePath}icon-eye-open.svg` 
        : `${basePath}icon-eye-closed.svg`;
    
    icon.onerror = () => {
        icon.src = isPassword 
            ? `${basePath}icon-eye-closed.svg`
            : `${basePath}icon-eye-open.svg`;
    };
}

function setupEventListeners() {
    elements.name.input.addEventListener('input', validateName);
    elements.email.input.addEventListener('input', validateEmail);
    elements.password.input.addEventListener('input', validatePassword);
    elements.confirmPassword.input.addEventListener('input', validateConfirmPassword);
    signupForm.addEventListener('submit', handleSubmit);
}

function validateName() {
    const { input, label } = elements.name;
    if (input.value.length < 3) {
        setInvalid(input, label, 'Mínimo 3 caracteres');
        elements.name.valid = false;
    } else {
        setValid(input, label, 'Nome');
        elements.name.valid = true;
    }
}

function validateEmail() {
    const { input, label, hint } = elements.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!input.value) {
        resetField(input, label, 'Email');
        hint.style.display = 'none';
        elements.email.valid = false;
    } else if (!emailRegex.test(input.value)) {
        setInvalid(input, label, 'Email');
        hint.textContent = 'Email inválido';
        hint.style.display = 'block';
        elements.email.valid = false;
    } else {
        setValid(input, label, 'Email');
        hint.style.display = 'none';
        elements.email.valid = true;
    }
}

function validatePassword() {
    const { input, label } = elements.password;
    if (input.value.length < 6) {
        setInvalid(input, label, 'Mínimo 6 caracteres');
        elements.password.valid = false;
    } else {
        setValid(input, label, 'Senha');
        elements.password.valid = true;
    }
    
    if (elements.confirmPassword.input.value) {
        validateConfirmPassword();
    }
}

function validateConfirmPassword() {
    const { input, label, hint } = elements.confirmPassword;
    if (!input.value) {
        resetField(input, label, 'Confirme sua senha');
        hint.style.display = 'none';
        elements.confirmPassword.valid = false;
    } else if (input.value !== elements.password.input.value) {
        setInvalid(input, label, 'Confirme sua senha');
        hint.textContent = 'Senhas não coincidem';
        hint.style.display = 'block';
        elements.confirmPassword.valid = false;
    } else {
        setValid(input, label, 'Confirme sua senha');
        hint.style.display = 'none';
        elements.confirmPassword.valid = true;
    }
}

function handleSubmit(event) {
    event.preventDefault();
    validateAllFields();

    if (allFieldsValid()) {
        registerUser();
    } else {
        showToast('Preencha todos os campos corretamente', 'error');
    }
}

function validateAllFields() {
    validateName();
    validateEmail();
    validatePassword();
    validateConfirmPassword();
}

function registerUser() {
    const users = JSON.parse(localStorage.getItem('listUser')) || [];
    const emailExists = users.some(user => user.email === elements.email.input.value);

    if (emailExists) {
        showToast('Este email já está cadastrado', 'error');
        return;
    }

    const newUser = {
        name: elements.name.input.value,
        email: elements.email.input.value,
        password: elements.password.input.value,
        avatar: '../../assets/image/avatar.png'
    };

    users.push(newUser);
    localStorage.setItem('listUser', JSON.stringify(users));
    showToast('Cadastro realizado com sucesso!', 'success');

    setTimeout(() => {
        window.location.href = "../login/login.html";
    }, 1500);
}

function allFieldsValid() {
    return Object.values(elements).every(field => field.valid);
}

function setInvalid(input, label, message) {
    input.style.borderColor = '#e74c3c';
    label.style.color = '#e74c3c';
    label.textContent = message;
}

function setValid(input, label, message) {
    input.style.borderColor = '#2ecc71';
    label.style.color = '#67c1f5';
    label.textContent = message;
}

function resetField(input, label, message) {
    input.style.borderColor = '#67c1f5';
    label.style.color = '';
    label.textContent = message;
}

function showToast(message, type) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}