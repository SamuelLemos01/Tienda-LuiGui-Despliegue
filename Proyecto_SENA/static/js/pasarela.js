document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const pasoIndicadores = document.querySelectorAll('.paso-indicador');
    const pasoContainers = document.querySelectorAll('.paso-container');
    const btnsSiguiente = document.querySelectorAll('.btn-siguiente');
    const btnsAnterior = document.querySelectorAll('.btn-anterior');
    const btnProceder = document.querySelector('.btn-proceder');
    const formulario = document.getElementById('form-pasarela');
    const loadingScreen = document.getElementById('loading-screen');
    const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
    const opcionesPago = document.querySelectorAll('input[name="metodo_pago"]');
    const totalElement = document.getElementById('total');
    const totalFinalElement = document.getElementById('total-final');
    
    // Inicializar carrito desde localStorage
    function inicializarCarrito() {
        try {
            const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
            document.getElementById('carrito_data').value = JSON.stringify(carrito);
            
            // Calcular total
            let total = carrito.reduce((sum, item) => {
                return sum + (parseFloat(item.precio) * parseInt(item.cantidad));
            }, 0);
            
            // Añadir costo de envío
            total += 3000; // Costo fijo de envío de 3000 pesos
            
            // Mostrar total
            totalElement.textContent = `$${total.toLocaleString('es-CO')}`;
            totalFinalElement.textContent = `$${total.toLocaleString('es-CO')}`;
            
            // Actualizar resumen
            actualizarResumenPedido();
        } catch (error) {
            console.error('Error al cargar el carrito:', error);
        }
    }
    
    // Función para cambiar de paso
    function cambiarPaso(pasoActual, pasoSiguiente) {
        // Ocultar paso actual
        pasoContainers[pasoActual].classList.add('d-none');
        pasoIndicadores[pasoActual].classList.remove('activo');
        
        // Mostrar paso siguiente
        pasoContainers[pasoSiguiente].classList.remove('d-none');
        pasoIndicadores[pasoSiguiente].classList.add('activo');
    }
    
    // Botones Siguiente
    btnsSiguiente.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            // Validación del paso actual
            if (index === 0) {
                // Validar campos del paso 1
                const nombre = document.getElementById('id_nombre').value;
                const apellido = document.getElementById('id_apellido').value;
                const email = document.getElementById('id_email').value;
                const telefono = document.getElementById('id_telefono').value;
                const direccion = document.getElementById('id_direccion').value;
                const municipio = document.getElementById('id_municipio').value;
                
                if (!nombre || !apellido || !email || !telefono || !direccion || municipio === '') {
                    alert('Por favor completa todos los campos de envío');
                    return;
                }
            } else if (index === 1) {
                // Validar si se seleccionó un método de pago
                const metodoPagoSeleccionado = document.querySelector('input[name="metodo_pago"]:checked');
                if (!metodoPagoSeleccionado) {
                    alert('Por favor selecciona un método de pago');
                    return;
                }
                
                // Configurar vista según método de pago seleccionado
                actualizarVistaMetodoPago(metodoPagoSeleccionado.value);
            }
            
            cambiarPaso(index, index + 1);
        });
    });
    
    // Botones Anterior
    btnsAnterior.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            cambiarPaso(index + 1, index);
        });
    });
    
    // Manejar selección de método de pago
    opcionesPago.forEach(radio => {
        radio.addEventListener('change', function() {
            // Ya no mostramos el modal QR automáticamente
            const metodoSeleccionado = this.value;
            
            // Solo cambiamos las clases para actualizar los QR disponibles
            // pero no mostramos el modal
            document.querySelectorAll('.qr-image').forEach(img => {
                img.classList.add('d-none');
            });
            
            if (metodoSeleccionado !== 'contra-entrega') {
                const qrElement = document.getElementById(`qr-${metodoSeleccionado}`);
                if (qrElement) {
                    qrElement.classList.remove('d-none');
                    // qrModal.show(); - Eliminamos esta línea para evitar que se abra automáticamente
                }
            }
        });
    });
    
    // Función para actualizar la vista según el método de pago
    function actualizarVistaMetodoPago(metodo) {
        // Referencias a los contenedores
        const qrContainer = document.getElementById('qr-container-paso3');
        const qrTitulo = document.querySelector('.qr-titulo');
        const qrInstruccion = document.querySelector('.qr-instruccion');
        const comprobanteContainer = document.getElementById('comprobante-container');
        const contraEntregaContainer = document.getElementById('contraentrega-container');
        
        // Ocultar todos los QR primero
        document.querySelectorAll('.qr-image-paso3').forEach(img => {
            img.classList.add('d-none');
        });
        
        if (metodo === 'contra-entrega') {
            // Para contra-entrega: Ocultar QR y comprobante, mostrar mensaje de contra-entrega
            qrContainer.classList.add('d-none');
            qrInstruccion.classList.add('d-none');
            comprobanteContainer.classList.add('d-none');
            contraEntregaContainer.classList.remove('d-none');
        } else {
            // Para métodos bancarios: Mostrar QR y comprobante, ocultar mensaje de contra-entrega
            qrContainer.classList.remove('d-none');
            qrInstruccion.classList.remove('d-none');
            comprobanteContainer.classList.remove('d-none');
            contraEntregaContainer.classList.add('d-none');
            
            // Mostrar el QR correspondiente
            const qrElement = document.getElementById(`qr-${metodo}-paso3`);
            if (qrElement) {
                qrElement.classList.remove('d-none');
            }
        }
    }
    
    // Envío del formulario
    formulario.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const metodoPagoSeleccionado = document.querySelector('input[name="metodo_pago"]:checked');
        
        // Verificar si se seleccionó un método de pago
        if (!metodoPagoSeleccionado) {
            alert('Por favor selecciona un método de pago');
            return;
        }
        
        // Para métodos bancarios (excepto contra-entrega), verificar comprobante
        if (metodoPagoSeleccionado.value !== 'contra-entrega') {
            const comprobante = document.getElementById('id_comprobante_pago');
            if (!comprobante.files || comprobante.files.length === 0) {
                alert('Por favor adjunta un comprobante de pago');
                return;
            }
        }
        
        // Mostrar pantalla de carga
        loadingScreen.style.display = 'flex';
        
        // Enviar formulario utilizando AJAX
        const formData = new FormData(this);
        
        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            // Ocultar pantalla de carga
            loadingScreen.style.display = 'none';
            
            if (data.status === 'success') {
                // Mostrar modal de éxito
                document.getElementById('success-message').textContent = data.message;
                const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                successModal.show();
                
                // Limpiar carrito
                localStorage.removeItem('carrito');
                
                // Configurar redirección
                document.getElementById('btn-ver-historial').addEventListener('click', function() {
                    window.location.href = data.redirect;
                });
            } else {
                // Mostrar mensaje de error
                alert(data.message || 'Ha ocurrido un error al procesar tu pedido');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadingScreen.style.display = 'none';
            alert('Ha ocurrido un error al procesar tu pedido');
        });
    });
    
    // Función para actualizar resumen del pedido
    function actualizarResumenPedido() {
        try {
            const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
            
            // Crear un contenedor para el resumen de productos en el primer paso
            const paso1Container = document.querySelector('.resumen-pedido-container');
            if (paso1Container) {
                // Primero, limpiar el contenedor excepto el botón y el total
                const btnSiguiente = paso1Container.querySelector('.btn-siguiente');
                const totalSection = paso1Container.querySelector('.total-section');
                
                if (totalSection) {
                    // Limpiar contenedor manteniendo solo el total
                    const nuevoResumen = document.createElement('div');
                    nuevoResumen.className = 'resumen-productos';
                    
                    // Generar lista de productos
                    carrito.forEach(item => {
                        const productoElement = document.createElement('div');
                        productoElement.className = 'producto-resumen';
                        
                        const nombreElement = document.createElement('span');
                        nombreElement.className = 'nombre-producto';
                        nombreElement.textContent = item.nombre;
                        
                        const cantidadElement = document.createElement('span');
                        cantidadElement.className = 'cantidad-producto';
                        cantidadElement.textContent = `x${item.cantidad}`;
                        
                        const precioElement = document.createElement('span');
                        precioElement.className = 'precio-producto';
                        precioElement.textContent = `$${(parseFloat(item.precio) * parseInt(item.cantidad)).toLocaleString('es-CO')}`;
                        
                        productoElement.appendChild(nombreElement);
                        productoElement.appendChild(cantidadElement);
                        productoElement.appendChild(precioElement);
                        
                        nuevoResumen.appendChild(productoElement);
                    });
                    
                    // Calcular subtotal
                    const subtotal = carrito.reduce((sum, item) => {
                        return sum + (parseFloat(item.precio) * parseInt(item.cantidad));
                    }, 0);
                    
                    // Crear elementos para subtotal y envío
                    const subtotalElement = document.createElement('div');
                    subtotalElement.className = 'resumen-row';
                    subtotalElement.innerHTML = `<span>Subtotal</span><span>$${subtotal.toLocaleString('es-CO')}</span>`;
                    
                    const envioElement = document.createElement('div');
                    envioElement.className = 'resumen-row';
                    envioElement.innerHTML = `<span>Envío</span><span>$3,000</span>`;
                    
                    // Eliminar todo excepto el botón
                    while (paso1Container.firstChild) {
                        paso1Container.removeChild(paso1Container.firstChild);
                    }
                    
                    // Reconstruir el contenedor con el nuevo resumen
                    paso1Container.appendChild(nuevoResumen);
                    paso1Container.appendChild(subtotalElement);
                    paso1Container.appendChild(envioElement);
                    paso1Container.appendChild(totalSection);
                    paso1Container.appendChild(btnSiguiente);
                }
            }
            
            // Actualizar el resumen en el paso 3
            const resumenFinalContainer = document.querySelector('.resumen-final-container');
            if (resumenFinalContainer) {
                // Limpiar contenedor
                while (resumenFinalContainer.firstChild) {
                    resumenFinalContainer.removeChild(resumenFinalContainer.firstChild);
                }
                
                const resumenContainer = document.createElement('div');
                resumenContainer.className = 'resumen-productos';
                
                // Generar elementos HTML para cada producto
                carrito.forEach(item => {
                    const productoElement = document.createElement('div');
                    productoElement.className = 'producto-resumen';
                    
                    const nombreElement = document.createElement('span');
                    nombreElement.className = 'nombre-producto';
                    nombreElement.textContent = item.nombre;
                    
                    const cantidadElement = document.createElement('span');
                    cantidadElement.className = 'cantidad-producto';
                    cantidadElement.textContent = `x${item.cantidad}`;
                    
                    const precioElement = document.createElement('span');
                    precioElement.className = 'precio-producto';
                    precioElement.textContent = `$${(parseFloat(item.precio) * parseInt(item.cantidad)).toLocaleString('es-CO')}`;
                    
                    productoElement.appendChild(nombreElement);
                    productoElement.appendChild(cantidadElement);
                    productoElement.appendChild(precioElement);
                    
                    resumenContainer.appendChild(productoElement);
                });
                
                // Calcular subtotal
                const subtotal = carrito.reduce((sum, item) => {
                    return sum + (parseFloat(item.precio) * parseInt(item.cantidad));
                }, 0);
                
                // Crear elementos para subtotal, envío y total
                const subtotalElement = document.createElement('div');
                subtotalElement.className = 'resumen-row';
                subtotalElement.innerHTML = `<span>Subtotal</span><span>$${subtotal.toLocaleString('es-CO')}</span>`;
                
                const envioElement = document.createElement('div');
                envioElement.className = 'resumen-row';
                envioElement.innerHTML = `<span>Envío</span><span>$3,000</span>`;
                
                const totalElement = document.createElement('div');
                totalElement.className = 'total-row';
                totalElement.innerHTML = `<span>Total</span><span class="total">$${(subtotal + 3000).toLocaleString('es-CO')}</span>`;
                
                // Añadir elementos
                resumenFinalContainer.appendChild(resumenContainer);
                resumenFinalContainer.appendChild(subtotalElement);
                resumenFinalContainer.appendChild(envioElement);
                resumenFinalContainer.appendChild(totalElement);
            }
            
        } catch (error) {
            console.error('Error al actualizar resumen del pedido:', error);
        }
    }
    
    // Verificar validez del carrito
    function verificarCarrito() {
        try {
            const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
            
            if (carrito.length === 0) {
                alert('Tu carrito está vacío. Agrega productos antes de continuar.');
                window.location.href = '/productos/';
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error al verificar carrito:', error);
            return false;
        }
    }
    
    // Verificar carrito al cargar
    if (!verificarCarrito()) {
        return;
    }
    
    // Prefill datos de usuario si está logueado
    function prefilUsuario() {
        const emailInput = document.getElementById('id_email');
        const telefonoInput = document.getElementById('id_telefono');
        const direccionInput = document.getElementById('id_direccion');
        const nombreInput = document.getElementById('id_nombre');
        const apellidoInput = document.getElementById('id_apellido');
        
        // Si hay datos en localStorage, usarlos para prefill
        if (emailInput.value && telefonoInput.value && direccionInput.value) {
            // Ya tienen valores, no hacer nada
        } else {
            // Intentar obtener datos del usuario
            fetch('/get-user-info/')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        emailInput.value = data.email || '';
                        telefonoInput.value = data.telefono || '';
                        direccionInput.value = data.direccion || '';
                        nombreInput.value = data.nombre || '';
                        apellidoInput.value = data.apellido || '';
                    }
                })
                .catch(error => {
                    console.error('Error al obtener información del usuario:', error);
                });
        }
    }
    
    // Mostrar QR modal cuando se hace clic en las imágenes
    document.querySelectorAll('.qr-image-paso3').forEach(img => {
        img.addEventListener('click', function() {
            const id = this.id.replace('-paso3', '');
            const modalImg = document.getElementById(id);
            if (modalImg) {
                document.querySelectorAll('.qr-image').forEach(modalImgElem => {
                    modalImgElem.classList.add('d-none');
                });
                modalImg.classList.remove('d-none');
                qrModal.show();
            }
        });
    });
    
    // Al cambiar el método de pago, también actualizar la interfaz en el paso 3
    document.querySelectorAll('input[name="metodo_pago"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const metodoSeleccionado = this.value;
            
            // Si ya estamos en el paso 3, actualizar la vista
            if (!document.getElementById('paso-3').classList.contains('d-none')) {
                actualizarVistaMetodoPago(metodoSeleccionado);
            }
        });
    });
    
    // Inicializar carrito
    inicializarCarrito();
    
    // Ejecutar funciones iniciales
    prefilUsuario();
});