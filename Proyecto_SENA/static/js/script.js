// Menu
let menu = document.querySelector('#menu-icon');
let navlist = document.querySelector('.items-navbar');
let cerrarBtn = document.querySelector('.cerrar-icono');

menu.onclick = () => {
    navlist.classList.toggle('open');
}

cerrarBtn.onclick = () => {
    navlist.classList.remove('open');
}

window.onscroll = () => {
    navlist.classList.remove('open');
}

// Función para manejar el dropdown
document.addEventListener('DOMContentLoaded', function() {
    const userIcon = document.querySelector('.nav-user-dropdown .ri-user-line');
    const dropdownContent = document.querySelector('.dropdown-content');
    
    // Función para cerrar el dropdown cuando se hace clic fuera
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.nav-user-dropdown')) {
            dropdownContent.classList.remove('active');
        }
    });

    // Toggle del dropdown al hacer clic en el icono
    userIcon.addEventListener('click', function(event) {
        event.stopPropagation();
        dropdownContent.classList.toggle('active');
    });

    // Inicializar y configurar el contador del carrito
    actualizarContador();
});

// Función para actualizar el contador de carrito en todas las páginas
function actualizarContador() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const contador = document.getElementById('contador-carrito');
    
    if (contador) {
        const totalItems = carrito.reduce((total, producto) => total + producto.cantidad, 0);
        
        if (totalItems > 0) {
            contador.textContent = totalItems;
            contador.style.display = 'flex';
        } else {
            contador.style.display = 'none';
        }
    }
}

// Detectar cambios en localStorage (para sincronizar entre pestañas)
window.addEventListener('storage', function(e) {
    if (e.key === 'carrito') {
        actualizarContador();
    }
});

function updateCartCount(newCount) {
    const counter = document.getElementById('contador-carrito');
    counter.textContent = newCount;
    counter.classList.add('notification-pulse');
    
    setTimeout(() => {
        counter.classList.remove('notification-pulse');
    }, 500);
}