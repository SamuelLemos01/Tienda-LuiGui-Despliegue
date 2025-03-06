document.addEventListener("DOMContentLoaded", function () {
    const ITEMS_PER_PAGE = 12;
    let currentPage = 1;
    let currentCategory = "todos";
    let productos = [];
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    
    // Elementos del DOM
    const modal = document.getElementById("productModal");
    const quantityInput = document.getElementById("quantity");
    const addToCartBtn = document.getElementById("addToCartBtn");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const searchForm = document.querySelector("form[role='search']");
    const procederBtn = document.getElementById("proceder-al-pedido");

    // Función para resetear el modal y el scroll
    function resetModalAndScroll() {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
    }

    // Configuración del botón "Proceder al pedido"
    if (procederBtn) {
        procederBtn.addEventListener("click", function(e) {
            e.preventDefault(); // Prevenir comportamiento predeterminado
            
            // Enviar datos del pedido mediante fetch o lo que estés usando actualmente
            fetch('/api/pedidos/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Incluir token CSRF si lo estás usando
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    // Los datos del pedido que estés enviando actualmente
                    // Aquí debes incluir todos los datos necesarios para el pedido
                })
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Error al procesar el pedido');
            })
            .then(data => {
                // Mostrar un modal de confirmación similar al de la imagen
                // Pero al hacer clic en "Aceptar", redirigirá al historial de compras
                
                const confirmModalHTML = `
                    <div class="modal fade" id="confirmacionPedidoModal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content bg-dark text-white">
                                <div class="modal-body p-4 text-center">
                                    <h5>mysite.com:8000 dice</h5>
                                    <p class="my-3">Pedido realizado con éxito, espere confirmación por correo electrónico</p>
                                    <button type="button" class="btn btn-primary" id="btnAceptarConfirmacion">Aceptar</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                
                // Insertar el modal en el DOM
                document.body.insertAdjacentHTML('beforeend', confirmModalHTML);
                
                // Mostrar el modal
                const confirmModal = new bootstrap.Modal(document.getElementById('confirmacionPedidoModal'));
                confirmModal.show();
                
                // Configurar el botón Aceptar
                document.getElementById('btnAceptarConfirmacion').addEventListener('click', function() {
                    confirmModal.hide();
                    setTimeout(() => {
                        // Redireccionar al historial de compras
                        window.location.href = 'historial/';
                        
                        // Limpiar el carrito después de la compra exitosa
                        localStorage.removeItem("carrito");
                    }, 150);
                });
                
                // También manejar el evento de cierre del modal
                document.getElementById('confirmacionPedidoModal').addEventListener('hidden.bs.modal', function() {
                    this.remove(); // Eliminar el modal del DOM
                    
                    // Redireccionar al historial de compras
                    window.location.href = '/historial/';
                    
                    // Limpiar el carrito después de la compra exitosa
                    localStorage.removeItem("carrito");
                });
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
            });
        });
    }

    // Añadir evento para el formulario de búsqueda
    if (searchForm) {
        searchForm.addEventListener("submit", function (event) {
            event.preventDefault(); // Evita que el formulario se envíe normalmente
            const query = searchInput.value.trim();
            fetchProducts(query);
        });
    }

    // Función unificada para obtener productos
    async function fetchProducts(query = "") {
        try {
            const url = `/api/productos/?buscar=${query}`;
            console.log("Realizando búsqueda con URL:", url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Datos recibidos del servidor:", data);
            
            // Actualizar la variable global de productos
            productos = data;
            
            // Resetear a la primera página cuando se realiza una búsqueda
            currentPage = 1;
            
            // Actualizar la visualización
            updateDisplay();
        } catch (error) {
            console.error("Error al cargar productos:", error);
        }
    }

    function filterProducts(category) {
        console.log('Filtering by category:', category);
        if (category === "todos") {
            return productos;
        }
        return productos.filter(p => p.categoria === category);
    }

    function displayProducts(products, page) {
        const start = (page - 1) * ITEMS_PER_PAGE;
        const paginatedProducts = products.slice(start, start + ITEMS_PER_PAGE);
        const container = document.getElementById("productos-container");
        
        if (!container) {
            console.error("No se encontró el contenedor de productos");
            return;
        }
        
        container.innerHTML = "";
        
        if (products.length === 0) {
            container.innerHTML = "<p class='text-center w-100 p-5'>No se encontraron productos.</p>";
            return;
        }
    
        paginatedProducts.forEach(product => {
            // Verificar disponibilidad
            const stockAvailable = product.inventario > 0;
            const stockText = stockAvailable ? 
                `<span class="text-success">${product.inventario} unidades disponibles</span>` : 
                '<span class="text-danger">Agotado</span>';
    
            container.innerHTML += `
                <div class="producto" data-categoria="${product.categoria}">
                    <img src="/media/${product.imagen}" alt="${product.nombre}">
                    <h2>${product.nombre}</h2>
                    <p>${product.descripcion}</p>
                    <div class="precio">
                        <p>$${product.precio} ${stockText}</p>
                        <button class="btn-comprar btn ${stockAvailable ? 'btn-success' : 'btn-secondary'}" 
                            ${stockAvailable ? `
                                data-bs-toggle="modal" 
                                data-bs-target="#productModal"
                            ` : 'disabled'}
                            data-id="${product.id}"
                            data-title="${product.nombre}"
                            data-description="${product.descripcion}"
                            data-price="${product.precio}"
                            data-stock="${product.inventario}"
                            data-image="/media/${product.imagen}">
                            ${stockAvailable ? 'Comprar' : 'Agotado'}
                        </button>
                    </div>
                </div>
            `;
        });
    }

    function updatePagination(products) {
        const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
        const paginationContainer = document.getElementById("pagination");
        
        if (!paginationContainer) {
            console.error("No se encontró el contenedor de paginación");
            return;
        }
        
        paginationContainer.innerHTML = "";

        // Si no hay productos, no mostrar paginación
        if (products.length === 0) {
            return;
        }

        // Botón "Anterior"
        const prevButton = document.createElement("li");
        prevButton.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = `
            <a class="page-link" href="#" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        `;
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                updateDisplay();
            }
        });
        paginationContainer.appendChild(prevButton);

        // Números de página
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement("li");
            pageItem.className = `page-item ${currentPage === i ? 'active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageItem.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                updateDisplay();
            });
            paginationContainer.appendChild(pageItem);
        }

        // Botón "Siguiente"
        const nextButton = document.createElement("li");
        nextButton.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = `
            <a class="page-link" href="#" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        `;
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                updateDisplay();
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    function updateDisplay() {
        const filteredProducts = filterProducts(currentCategory);
        displayProducts(filteredProducts, currentPage);
        updatePagination(filteredProducts);
    }

    // Configuración de eventos para categorías
    document.querySelectorAll(".btn-verde").forEach(button => {
        button.addEventListener("click", function() {
            document.querySelectorAll(".btn-verde").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            
            // Nueva forma de obtener la categoría
            const classes = this.className.split(' ');
            const categoryClass = classes.find(cls => 
                ['todos', 'aseo', 'comestibles', 'canastafamiliar', 'papeleria'].includes(cls)
            );
            
            // Mapear las clases a las categorías del modelo
            const categoryMap = {
                'todos': 'todos',
                'aseo': 'aseo',
                'comestibles': 'comestibles',
                'canastafamiliar': 'canasta_familiar',
                'papeleria': 'papeleria'
            };
            
            currentCategory = categoryMap[categoryClass] || 'todos';
            currentPage = 1;
            updateDisplay();
        });
    });

    // Configuración del modal
    if (modal) {
        modal.addEventListener("show.bs.modal", function (event) {
            const button = event.relatedTarget;
            const stock = parseInt(button.getAttribute("data-stock"));
            
            modal.querySelector("#productTitle").textContent = button.getAttribute("data-title");
            modal.querySelector("#productDescription").textContent = button.getAttribute("data-description");
            modal.querySelector("#productPrice").textContent = `$${button.getAttribute("data-price")}`;
            modal.querySelector("#productImage").src = button.getAttribute("data-image");
            modal.setAttribute("data-product-id", button.getAttribute("data-id"));
            modal.setAttribute("data-stock", stock);
    
            // Mostrar stock disponible en el modal
            const stockInfo = document.getElementById("stockInfo");
            if (stockInfo) {
                stockInfo.textContent = `Stock disponible: ${stock} unidades`;
            }
    
            // Resetear cantidad a 1
            if (quantityInput) {
                quantityInput.value = 1;
                quantityInput.max = stock; // Establecer máximo según el stock
            }
        });
    
        modal.addEventListener('hidden.bs.modal', function () {
            resetModalAndScroll();
        });
    }

    // Configurar botón de agregar al carrito
    if (addToCartBtn) {
        addToCartBtn.addEventListener("click", function () {
            const id = modal.getAttribute("data-product-id");
            const stock = parseInt(modal.getAttribute("data-stock"));
            const cantidad = parseInt(quantityInput.value);

            // Verificar si hay suficiente stock
            if (cantidad > stock) {
                alert(`Lo sentimos, solo hay ${stock} unidades disponibles.`);
                return;
            }

            // Verificar si ya hay productos en el carrito
            const existingProduct = carrito.find(p => p.id === id);
            const cantidadTotal = existingProduct ? 
                existingProduct.cantidad + cantidad : 
                cantidad;

            if (cantidadTotal > stock) {
                alert(`Lo sentimos, no hay suficiente stock. Ya tienes ${existingProduct.cantidad} unidades en el carrito.`);
                return;
            }

            const producto = {
                id: id,
                nombre: modal.querySelector("#productTitle").textContent,
                precio: parseFloat(modal.querySelector("#productPrice").textContent.replace("$", "")),
                imagen: modal.querySelector("#productImage").src,
                cantidad: cantidad,
                stock: stock
            };

            if (existingProduct) {
                existingProduct.cantidad = cantidadTotal;
            } else {
                carrito.push(producto);
            }

            localStorage.setItem("carrito", JSON.stringify(carrito));
            
            // Actualizar el contador del carrito directamente
            const contador = document.getElementById('contador-carrito');
            if (contador) {
                const totalItems = carrito.reduce((total, producto) => total + producto.cantidad, 0);
                if (totalItems > 0) {
                    contador.textContent = totalItems;
                    contador.style.display = 'flex';
                    // Añadir clase para la animación
                    contador.classList.remove('notification-pulse');
                    void contador.offsetWidth; // Forzar reflow
                    contador.classList.add('notification-pulse');
                } else {
                    contador.style.display = 'none';
                }
            }

            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
                setTimeout(() => {
                    resetModalAndScroll();
                }, 150);
            }

            const alert = document.createElement('div');
            // Establecemos todos los estilos directamente para mayor control
            alert.className = 'alert alert-success';
            alert.style.position = 'fixed';
            alert.style.top = '80px';
            alert.style.right = '20px';
            alert.style.zIndex = '9999';
            alert.style.padding = '10px 15px';
            alert.style.borderRadius = '4px';
            alert.textContent = 'Producto agregado al carrito';
            document.body.appendChild(alert);
            
            setTimeout(() => {
                alert.remove();
            }, 1500);
        });
    }

    // SOLUCIÓN PARA LOS BOTONES DE INCREMENTO/DECREMENTO
    
    // Configurar botón de decremento (con técnica de clonación para eliminar eventos previos)
    if (document.getElementById("decrementBtn")) {
        const decrementBtn = document.getElementById("decrementBtn");
        const newDecrementBtn = decrementBtn.cloneNode(true);
        decrementBtn.parentNode.replaceChild(newDecrementBtn, decrementBtn);
        
        newDecrementBtn.addEventListener("click", () => {
            const currentVal = parseInt(quantityInput.value);
            if (currentVal > 1) {
                quantityInput.value = currentVal - 1;
            }
        });
    }

    // Configurar botón de incremento (con técnica de clonación para eliminar eventos previos)
    if (document.getElementById("incrementBtn")) {
        const incrementBtn = document.getElementById("incrementBtn");
        const newIncrementBtn = incrementBtn.cloneNode(true);
        incrementBtn.parentNode.replaceChild(newIncrementBtn, incrementBtn);
        
        newIncrementBtn.addEventListener("click", () => {
            const currentVal = parseInt(quantityInput.value);
            const stock = parseInt(modal.getAttribute("data-stock"));
            if (currentVal < stock) {
                quantityInput.value = currentVal + 1;
            } else {
                alert(`No puedes agregar más unidades. Stock disponible: ${stock}`);
            }
        });
    }

    // Función auxiliar para obtener el token CSRF
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Cargar productos al inicio
    fetchProducts();
});