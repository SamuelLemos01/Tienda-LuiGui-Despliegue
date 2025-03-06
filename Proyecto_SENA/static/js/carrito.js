document.addEventListener('DOMContentLoaded', function() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    
    function actualizarCarritoUI() {
        const contenedor = document.getElementById('productos-carrito-container');
        const carritoVacio = document.getElementById('carrito-vacio');
        const resumen = document.getElementById('resumen-carrito');
        
        if (carrito.length === 0) {
            carritoVacio.style.display = 'block';
            contenedor.style.display = 'none';
            resumen.style.display = 'none';
            return;
        }
        
        carritoVacio.style.display = 'none';
        contenedor.style.display = 'block';
        resumen.style.display = 'block';
        
        contenedor.innerHTML = carrito.map(producto => `
            <div class="producto-carrito">
                <img src="${producto.imagen}" alt="${producto.nombre}">
                <div class="producto-info">
                    <h3>${producto.nombre}</h3>
                    <p class="producto-precio">$${(producto.precio * producto.cantidad)}</p>
                    <div class="producto-cantidad">
                        <span class="cantidad-valor">Cantidad: ${producto.cantidad}</span>
                    </div>
                </div>
                <button class="btn-eliminar" onclick="eliminarProducto('${producto.id}')">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `).join('');
        
        const subtotal = carrito.reduce((sum, producto) => sum + (producto.precio * producto.cantidad), 0);
        const domicilio = 3000;
        document.getElementById('subtotal').textContent = `$${subtotal}`;
        document.getElementById('domicilio').textContent = `$${domicilio}`;
        document.getElementById('total').textContent = `$${(subtotal + domicilio)}`;
        
        actualizarContadorCarrito();
    }
    
    function actualizarContadorCarrito() {
        const contador = document.getElementById('contador-carrito');
        if (!contador) return;
        
        const totalItems = carrito.reduce((total, producto) => total + producto.cantidad, 0);
        
        if (totalItems > 0) {
            contador.textContent = totalItems;
            contador.style.display = 'flex';
            // Añadir animación al actualizar
            contador.classList.remove('notification-pulse');
            void contador.offsetWidth; // Forzar reflow
            contador.classList.add('notification-pulse');
        } else {
            contador.style.display = 'none';
        }
    }
    
    window.modificarCantidad = function(id, cambio) {
        const producto = carrito.find(p => p.id === id);
        if (producto && (producto.cantidad + cambio) > 0) {
            producto.cantidad += cambio;
            localStorage.setItem('carrito', JSON.stringify(carrito));
            actualizarCarritoUI();
        }
    };
    
    window.eliminarProducto = function(id) {
        carrito = carrito.filter(p => p.id !== id);
        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarCarritoUI();
    };
    
    window.actualizarContadorCarritoGlobal = function() {
        const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
        const contador = document.getElementById('contador-carrito');
        if (!contador) return;
        
        const totalItems = carrito.reduce((total, producto) => total + producto.cantidad, 0);
        
        if (totalItems > 0) {
            contador.textContent = totalItems;
            contador.style.display = 'flex';
            // Añadir animación al actualizar 
            contador.classList.remove('notification-pulse');
            void contador.offsetWidth; // Forzar reflow
            contador.classList.add('notification-pulse');
        } else {
            contador.style.display = 'none';
        }
    };
    
    actualizarCarritoUI();
});