document.addEventListener('DOMContentLoaded', function() {
    // Inicializar todas las funciones principales
    cargarDatosUsuario();
    inicializarCarrito();
    configurarMetodosPago();
    configurarFormulario();
    configurarInputArchivo();
    
    // Verificar que Bootstrap esté disponible y crear la modal
    let qrModal;
    try {
        if (typeof bootstrap !== 'undefined') {
            const modalElement = document.getElementById('qrModal');
            if (modalElement) {
                qrModal = new bootstrap.Modal(modalElement);
                console.log('Modal inicializada correctamente');
            } else {
                console.error('Elemento modal no encontrado');
            }
        } else {
            console.error('Bootstrap no está disponible');
        }
    } catch (error) {
        console.error('Error al inicializar modal:', error);
    }
    
    // Cargar datos del usuario autenticado
    function cargarDatosUsuario() {
        fetch('/usuario-info/')
            .then(response => response.json())
            .then(data => {
                if (data.usuario) {
                    // Rellenar los campos con los datos del usuario
                    const usuario = data.usuario;
                    
                    if (usuario.first_name) {
                        document.getElementById('id_nombre').value = usuario.first_name;
                    }
                    
                    if (usuario.last_name) {
                        document.getElementById('id_apellido').value = usuario.last_name;
                    }
                    
                    if (usuario.email) {
                        document.getElementById('id_email').value = usuario.email;
                    }
                    
                    if (usuario.numero) {
                        document.getElementById('id_telefono').value = usuario.numero;
                    }
                    
                    if (usuario.direccion) {
                        document.getElementById('id_direccion').value = usuario.direccion;
                    }
                }
            })
            .catch(error => console.error('Error al cargar datos de usuario:', error));
    }
    
    // Inicializar el carrito y actualizar el resumen
    function inicializarCarrito() {
        const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
        
        // Actualizar el resumen del pedido con los productos
        actualizarResumenPedido(carrito);
        
        // Actualizar el input hidden con los datos del carrito
        document.getElementById('carrito_data').value = JSON.stringify(carrito);
    }
    
    // Actualizar el resumen del pedido con los productos del carrito
    function actualizarResumenPedido(carrito) {
        const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        const envio = 3000;
        const total = subtotal + envio;
        
        // Crear resumen de items
        let resumenHTML = '<div class="resumen-pedido">';
        
        // Agregar cada item
        carrito.forEach(item => {
            resumenHTML += `
                <div class="item-resumen">
                    <div class="item-info">
                        <span class="item-nombre">${item.nombre}</span>
                        <span class="item-cantidad">x${item.cantidad}</span>
                    </div>
                    <span class="item-precio">$${(item.precio * item.cantidad).toLocaleString()}</span>
                </div>
            `;
        });
        
        // Agregar subtotal y envío
        resumenHTML += `
            <div class="subtotal-row">
                <span>Subtotal</span>
                <span>$${subtotal.toLocaleString()}</span>
            </div>
            <div class="envio-row">
                <span>Envío</span>
                <span>$${envio.toLocaleString()}</span>
            </div>
        </div>`;
        
        // Encontrar el contenedor del total e insertar el resumen antes
        const totalSection = document.querySelector('.total-section');
        if (totalSection) {
            const totalSpan = document.getElementById('total');
            if (totalSpan) {
                totalSpan.textContent = `$${total.toLocaleString()}`;
            }
            
            // Remover resumen anterior si existe
            const resumenExistente = totalSection.querySelector('.resumen-pedido');
            if (resumenExistente) {
                resumenExistente.remove();
            }
            
            // Insertar nuevo resumen
            totalSection.insertAdjacentHTML('afterbegin', resumenHTML);
        }
    }
    
    // Configurar la funcionalidad de los métodos de pago
    function configurarMetodosPago() {
        const metodosPago = document.querySelectorAll('input[name="metodo_pago"]');
        
        metodosPago.forEach(metodo => {
            metodo.addEventListener('change', function() {
                if (this.checked) {
                    // Ocultar todas las imágenes QR en la modal
                    document.querySelectorAll('.qr-image').forEach(img => {
                        img.classList.add('d-none');
                    });
                    
                    // Obtener el valor del método seleccionado
                    const metodoSeleccionado = this.value;
                    console.log('Método seleccionado:', metodoSeleccionado);
                    
                    // Mostrar la imagen QR correspondiente
                    const qrImagen = document.getElementById(`qr-${metodoSeleccionado}`);
                    
                    if (qrImagen) {
                        qrImagen.classList.remove('d-none');
                        
                        // Intentar mostrar la modal
                        if (qrModal) {
                            try {
                                qrModal.show();
                                console.log('Modal mostrada');
                            } catch (error) {
                                console.error('Error al mostrar modal:', error);
                                // Fallback: mostrar las imágenes de QR directamente sin modal
                                mostrarQRSinModal(metodoSeleccionado);
                            }
                        } else {
                            console.error('Modal no inicializada, mostrando QR sin modal');
                            // Fallback: mostrar las imágenes de QR directamente sin modal
                            mostrarQRSinModal(metodoSeleccionado);
                        }
                    } else {
                        console.error(`No se encontró la imagen QR para: ${metodoSeleccionado}`);
                    }
                }
            });
        });
    }
    
    // Función alternativa para mostrar QR si la modal falla
    function mostrarQRSinModal(metodoSeleccionado) {
        // Esta función se usa como fallback si la modal de Bootstrap no funciona
        // Asegurarse de que el contenedor de QR existe
        let qrContainer = document.getElementById('qr-container');
        
        if (!qrContainer) {
            // Crear el contenedor si no existe
            qrContainer = document.createElement('div');
            qrContainer.id = 'qr-container';
            qrContainer.className = 'mt-3 p-3 border rounded text-center';
            
            // Agregar el contenedor después del formulario
            const formPasarela = document.getElementById('form-pasarela');
            formPasarela.parentNode.insertAdjacentElement('afterend', qrContainer);
        }
        
        // Limpiar el contenedor
        qrContainer.innerHTML = '';
        
        // Clonar la imagen QR y agregarla al contenedor
        const qrImagen = document.getElementById(`qr-${metodoSeleccionado}`);
        if (qrImagen) {
            const qrClon = qrImagen.cloneNode(true);
            qrClon.classList.remove('d-none');
            
            qrContainer.innerHTML = '<h4>Escanea para realizar tu pago</h4>';
            qrContainer.appendChild(qrClon);
            qrContainer.innerHTML += '<p class="mt-2">Escanea este código QR para completar tu pago y guarda el comprobante.</p>';
        }
    }
    
    // Funciones para la pantalla de carga
    function mostrarPantallaCarga() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    
    function ocultarPantallaCarga() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    // Configurar validación y envío del formulario
    function configurarFormulario() {
        const formPasarela = document.getElementById('form-pasarela');
        const btnProceder = document.querySelector('.btn-proceder');
        
        formPasarela.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Verificar si el botón está deshabilitado (evita múltiples envíos)
            if (btnProceder.disabled) {
                return;
            }
            
            // Verificar si hay productos en el carrito
            const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
            if (carrito.length === 0) {
                alert('Tu carrito está vacío');
                return;
            }
            
            // Validar campos requeridos
            const municipio = document.getElementById('id_municipio')?.value;
            const metodoPago = document.querySelector('input[name="metodo_pago"]:checked');
            
            if (!municipio || municipio === '') {
                alert('Por favor selecciona un municipio');
                return;
            }
            
            if (!metodoPago) {
                alert('Por favor selecciona un método de pago');
                return;
            }
            
            // Verificar el comprobante si es necesario según el método de pago
            const comprobantePago = document.querySelector('input[name="comprobante_pago"]');
            if (['bancolombia', 'nequi', 'daviplata'].includes(metodoPago.value)) {
                if (!comprobantePago.files || comprobantePago.files.length === 0) {
                    alert('Por favor adjunta el comprobante de pago');
                    return;
                }
            }
            
            // Mostrar pantalla de carga
            mostrarPantallaCarga();
            
            // Deshabilitar el botón para evitar múltiples envíos
            btnProceder.disabled = true;
            btnProceder.classList.add('disabled');
            btnProceder.textContent = 'Procesando...';
            
            // Actualizar datos del carrito en el formulario
            document.getElementById('carrito_data').value = JSON.stringify(carrito);
            
            // Preparar envío del formulario
            const formData = new FormData(this);
            
            try {
                const response = await fetch('/message-pasarela/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                const data = await response.json();
                
                // Ocultar pantalla de carga
                ocultarPantallaCarga();
                
                if (data.status === 'success') {
                    localStorage.removeItem('carrito'); // Limpiar carrito
                    alert('Pedido realizado con éxito, espere confirmación por correo electrónico');
                    window.location.href = data.redirect || '/historial/';
                } else {
                    // Restaurar el botón
                    btnProceder.disabled = false;
                    btnProceder.classList.remove('disabled');
                    btnProceder.textContent = 'Proceder al pedido';
                    
                    alert(data.message || 'Error al procesar la orden');
                }
            } catch (error) {
                // Ocultar pantalla de carga
                ocultarPantallaCarga();
                
                // Restaurar el botón
                btnProceder.disabled = false;
                btnProceder.classList.remove('disabled');
                btnProceder.textContent = 'Proceder al pedido';
                
                console.error('Error al procesar el pedido:', error);
                alert('Hubo un error al procesar tu pedido.');
            }
        });
    }
    
    // Configurar el input de archivo para mejor experiencia de usuario
    function configurarInputArchivo() {
        const fileInput = document.querySelector('input[name="comprobante_pago"]');
        
        if (fileInput) {
            const fileContainer = fileInput.closest('.file-upload-container');
            
            fileInput.addEventListener('change', function() {
                if (this.files && this.files.length > 0) {
                    const fileName = this.files[0].name;
                    console.log('Archivo seleccionado:', fileName);
                    
                    // Verificar si ya existe un elemento para mostrar el nombre
                    let fileNameDisplay = fileContainer.querySelector('.file-name-display');
                    
                    if (!fileNameDisplay) {
                        // Crear el elemento si no existe
                        fileNameDisplay = document.createElement('div');
                        fileNameDisplay.className = 'file-name-display';
                        fileContainer.appendChild(fileNameDisplay);
                    }
                    
                    fileNameDisplay.textContent = fileName;
                    fileContainer.classList.add('file-selected');
                }
            });
        }
    }
});