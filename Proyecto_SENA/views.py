from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, authenticate, logout
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import FormularioRegistroUsuario, FormularioContacto, FormularioPasarela
from .models import (
    Producto, Inventario, Pedido, ProductosPedido,
    HistorialPedidos, Contacto
)
from django.http import JsonResponse
from decimal import Decimal
import json
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from django.core.paginator import Paginator
from django.contrib.staticfiles import finders
import os
from .models import Producto
from django.db import models 
from django.contrib.auth.decorators import login_required

def inicio(request):
    """Vista para la página de inicio"""
    return render(request, 'inicio.html')

def galeria(request):
    """Vista para la galería de imágenes"""
    return render(request, 'galeria.html')

def perfil(request):
    """Vista para el perfil de usuario"""
    return render(request, 'perfil.html')

def catalogo(request):
    """Vista para el catálogo de productos"""
    query = request.GET.get('buscar', '')  # Obtiene el valor del input de búsqueda
    productos = Producto.objects.filter()

    if query:
        productos = productos.filter(nombre__icontains=query)  # Filtra por nombre

    return render(request, 'catalogo.html', {'productos': productos, 'query': query})

def api_productos(request):
    """
    Vista para obtener productos en formato JSON, con soporte para búsqueda.
    """
    query = request.GET.get('buscar', '')  # Obtiene el término de búsqueda
    productos = Producto.objects.filter(disponible=True)

    if query:
        # Búsqueda más completa: por nombre o descripción
        productos = productos.filter(
            models.Q(nombre__icontains=query) | 
            models.Q(descripcion__icontains=query)
        )

    # Lista para almacenar los productos con información de inventario
    productos_con_inventario = []
    
    for producto in productos:
        producto_dict = {
            'id': producto.id,
            'nombre': producto.nombre,
            'descripcion': producto.descripcion,
            'precio': str(producto.precio),
            'categoria': producto.categoria,
            'imagen': str(producto.imagen),
        }
        
        # Obtener información de inventario
        try:
            inventario = Inventario.objects.get(producto_id=producto.id)
            producto_dict['inventario'] = inventario.unidades_totales
        except Inventario.DoesNotExist:
            producto_dict['inventario'] = 0
            
        productos_con_inventario.append(producto_dict)

    return JsonResponse(productos_con_inventario, safe=False)

def carrito(request):
    """Vista para el carrito de compras"""
    return render(request, 'carrito.html')

def manual(request):
    """Vista para el carrito el manual de usuario"""
    return render(request, 'manual.html')

def logout_perfil(request):
    """Función para cerrar sesión"""
    logout(request)
    return redirect('inicio')

def register(request):
    if request.method == "POST":
        form = FormularioRegistroUsuario(request.POST)
        if form.is_valid():
            user = form.save()
            messages.success(request, "Registro exitoso, Por favor inicia sesión")
            return redirect('login')
        else:
            # Esto mantendrá los datos previamente ingresados
            for field in form.errors:
                for error in form[field].errors:
                    messages.error(request, f"{field}: {error}")
    else:
        form = FormularioRegistroUsuario()
    
    return render(request, 'register.html', {
        'register_mode': True, 
        'form': form,  # Formulario con datos previos
    })

def login(request):
    """
    Vista para el inicio de sesión.
    Autentica a los usuarios y crea su sesión.
    """
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                auth_login(request, user)
                return redirect('catalogo')
            else:
                messages.error(request, "Usuario o contraseña incorrectos")
        else:
            messages.error(request, "Usuario o contraseña incorrectos")
    return render(request, 'login.html', {'register_mode': False})

@login_required(login_url='login')
def perfil(request):
    """
    Vista para gestionar el perfil del usuario.
    Permite cambiar contraseña y eliminar cuenta.
    """
    if request.method == 'POST':
        if 'delete_account' in request.POST:
            request.user.delete()
            messages.success(request, "Cuenta eliminada exitosamente")
            return redirect('inicio')
        elif 'change_password' in request.POST:
            password_form = PasswordChangeForm(request.user, request.POST)
            if password_form.is_valid():
                user = password_form.save()
                messages.success(request, 'Contraseña actualizada exitosamente')
                logout(request)
                return redirect('login')
            else:
                for error in password_form.errors.values():
                    messages.error(request, error[0])
    else:
        password_form = PasswordChangeForm(request.user)

    try:
        profile = request.user.perfilusuario
        context = {
            'user': request.user,
            'profile': profile,
            'password_form': password_form
        }
        return render(request, 'perfil.html', context)
    except AttributeError:
        return render(request, 'perfil.html', {'password_form': password_form})

def get_products(request):
    productos = Producto.objects.filter(disponible=True).values(
        'id', 'nombre', 'descripcion', 'precio', 
        'categoria', 'imagen'
    )
    
    productos_list = list(productos)
    
    for producto in productos_list:
        try:
            inventario = Inventario.objects.get(producto_id=producto['id'])
            producto['inventario'] = inventario.unidades_totales 
        except Inventario.DoesNotExist:
            producto['inventario'] = 0
    
    return JsonResponse(productos_list, safe=False)
from django.core.mail import send_mail
def contact(request):
    """
    Vista para procesar el formulario de contacto.
    Guarda los mensajes de contacto en la base de datos.
    """
    if request.method == 'POST':
        form = FormularioContacto(request.POST)
        if form.is_valid():
            contact = form.save() 
            messages.success(request, "Mensaje enviado") 
            form.send_mail() 
            return redirect('contact')  
        else:
            for field in form.errors:
                for error in form[field].errors:
                    messages.error(request, f"{field}: {error}")
    else:
        form = FormularioContacto()
    return render(request, 'inicio.html', {'form': form})

def get_datos(user):
    """
    Función auxiliar para obtener datos del usuario.
    """
    if hasattr(user, 'perfilusuario'):
        return {
            'nombre': user.first_name,
            'apellido': user.last_name,
            'email': user.email,
            'telefono': user.perfilusuario.numero,
            'direccion': user.perfilusuario.direccion
        }
    return {}

@login_required
def usuario_info(request):
    """
    Vista para obtener información del usuario.
    Retorna un JSON con los datos del perfil.
    """
    user = request.user
    user_profile = user.perfilusuario
    
    return JsonResponse({
        'usuario': {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'numero': user_profile.numero,
            'direccion': user_profile.direccion
        }
    })

@login_required
def pasarela(request):
    """
    Vista para procesar el pago y crear pedidos.
    Maneja la creación de pedidos y sus productos asociados.
    """
    if request.method == 'POST':
        form = FormularioPasarela(request.POST, request.FILES)
        if form.is_valid():
            try:
                carrito_data = request.POST.get('carrito_data')
                if not carrito_data:
                    return JsonResponse({
                        'status': 'error',
                        'message': 'El carrito está vacío'
                    })

                carrito = json.loads(carrito_data)
                if not carrito:
                    return JsonResponse({
                        'status': 'error',
                        'message': 'El carrito está vacío'
                    })

                # Calcular subtotal
                subtotal = Decimal(str(sum(Decimal(str(item['precio'])) * int(item['cantidad']) for item in carrito)))
                costo_envio = Decimal('3000')
                total = subtotal + costo_envio

                # Crear el pedido
                pedido = form.save(commit=False)
                pedido.usuario = request.user
                pedido.subtotal = subtotal
                pedido.costo_envio = costo_envio
                pedido.total = total
                pedido.save()

                # Guardar productos del pedido
                for item in carrito:
                    producto = Producto.objects.get(id=item['id'])
                    cantidad = int(item['cantidad'])
                    try:
                        inventario = Inventario.objects.get(producto=producto)
                        if inventario.disminuir_stock(cantidad):
                            ProductosPedido.objects.create(
                                pedido=pedido,
                                producto=producto,
                                cantidad=cantidad,
                                precio_unitario=Decimal(str(item['precio'])),
                                subtotal=Decimal(str(item['precio'])) * cantidad
                            )
                        else:
                            return JsonResponse({
                                'status': 'error',
                                'message': f'No hay suficiente stock para {producto.nombre}'
                            })
                    except Inventario.DoesNotExist:
                        return JsonResponse({
                            'status': 'error',
                            'message': f'No hay inventario para {producto.nombre}'
                        })
                
                # Enviar correo de confirmación
                form.send_order_mail(carrito, total)
                
                # Crear registro en el historial
                HistorialPedidos.objects.create(
                    usuario=request.user,
                    pedido=pedido,
                    numero_pedido=f"#{pedido.id}",
                    numero_productos=sum(int(item['cantidad']) for item in carrito),
                    compra_total=total
                )

                return JsonResponse({
                    'status': 'success',
                    'message': 'Pedido creado, espere confirmación por correo',
                    'redirect': '/historial/'
                })
            
            except Producto.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Uno o más productos no existen en la base de datos'
                })
        else:
            return JsonResponse({
                'status': 'error',
                'errors': form.errors
            })

    form = FormularioPasarela(initial=get_datos(request.user))
    return render(request, 'pasarela.html', {
        'form': form
    })

def MessagePasarela(request):
    """
    Vista para enviar correos de confirmación de pedido y guardar el pedido.
    """
    if request.method == "POST":
        form = FormularioPasarela(request.POST, request.FILES)
        if form.is_valid():
            try:
                # Procesar y crear pedido usando pasarela
                response = pasarela(request)
                
                # Si hubo un error en pasarela, devolver la respuesta
                if isinstance(response, JsonResponse):
                    response_data = json.loads(response.content)
                    if response_data.get('status') == 'error':
                        return response
                
                # Obtener datos para el correo personalizado
                nombre = request.POST.get('nombre')
                apellido = request.POST.get('apellido')
                email = request.POST.get('email')
                telefono = request.POST.get('telefono')
                direccion = request.POST.get('direccion')
                metodo_pago = request.POST.get('metodo_pago')
                
                carrito = json.loads(request.POST.get('carrito_data'))
                
                for producto in carrito:
                    producto['subtotal'] = float(producto['precio']) * int(producto['cantidad'])
                
                subtotal = sum(float(item['precio']) * int(item['cantidad']) for item in carrito)
                envio = 3000
                total = subtotal + envio
                
                template = render_to_string('email_template.html', {
                    'nombre': nombre,
                    'apellido': apellido,
                    'email': email,
                    'telefono': telefono,
                    'direccion': direccion,
                    'metodo_pago': metodo_pago,
                    'productos': carrito,
                    'subtotal': f"{subtotal:,.0f}",
                    'envio': f"{envio:,.0f}",
                    'total': f"{total:,.0f}"
                })
                
                email_message = EmailMessage(
                    'Confirmación de pedido - Tienda Luigui',
                    template,
                    settings.EMAIL_HOST_USER,
                    [email]
                )
                
                email_message.content_subtype = "html"
                email_message.send()
                
                return JsonResponse({
                    'status': 'success',
                    'message': 'Pedido confirmado. Revisa tu correo.',
                    'redirect': '/historial/'
                })
                
            except Exception as e:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Error al procesar el pedido: {str(e)}'
                })
        else:
            return JsonResponse({
                'status': 'error',
                'errors': form.errors
            })
    
    return JsonResponse({
        'status': 'error',
        'message': 'Método no permitido'
    })

@login_required
def history(request):
    """
    Vista para mostrar el historial de pedidos del usuario.
    Incluye paginación para mejor navegación.
    """
    pedidos_historial = HistorialPedidos.objects.filter(usuario=request.user).order_by('-fecha_compra')
    
    for pedido_historial in pedidos_historial:
        try:
            pedido_id = pedido_historial.numero_pedido.replace('#', '')
            pedido = Pedido.objects.filter(id=pedido_id).first()

            if pedido:
                pedido_historial.pedido = pedido
            else:
                class EmptyPedido:
                    def __init__(self):
                        self.items = []
                
                pedido_historial.pedido = EmptyPedido()
                pedido_historial.pedido.items = Pedido.objects.none()
        except (ValueError, Pedido.DoesNotExist):
            class EmptyPedido:
                def __init__(self):
                    self.items = []
            
            pedido_historial.pedido = EmptyPedido()
            pedido_historial.pedido.items = Pedido.objects.none()
    
    # Paginación
    paginator = Paginator(pedidos_historial, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'historial.html', {'page_obj': page_obj})

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

def restablecer(request):
    if request.method == "POST":
        email = request.POST.get("email")
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            enlace = request.build_absolute_uri(f"/cambiar_contrasena/{uid}/{token}/")
            send_mail(
                'Restablecer contraseña',
                f'Haz clic en el siguiente en enlace para restablecer tu contraseña {enlace}',
                'TiendaLuigui1@gmail.com',
                [email], 
                fail_silently=False
            )
            messages.success(request, "Se ah enviado un enlace de restablecimiento de contraseña a su correo")
            return redirect('login')
        else:
            messages.success(request, "No se encontro algun usuario registrado con ese correo")
        return redirect('restablecer')
    return render(request, 'email_restablecer.html')

def cambiar_contrasena(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))  
        user = User.objects.get(pk=uid) 
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
    
    if user and default_token_generator.check_token(user, token):
        if request.method == "POST":
            nueva_contrasena = request.POST.get("password")
            
            if not nueva_contrasena:
                messages.error(request, "La contraseña no puede estar vacía")
                return render(request, "email_contrasena.html")
                
            
            user.set_password(nueva_contrasena)
            user.save()
            
            return redirect('confirmacion_contrasena')
        
        return render(request, "email_contrasena.html")
    return redirect("login")

def confirmacion_contrasena(request):
    return render(request, "cambio_contrasena.html")


from .forms import FormularioCompletarPerfil
from .models import PerfilUsuario
def completar_perfil(request):
    """
    Vista para completar el perfil después del registro con Google.
    """
    if request.method == 'POST':
        form = FormularioCompletarPerfil(request.POST)
        if form.is_valid():
            # Verificar si ya existe un perfil
            try:
                perfil = PerfilUsuario.objects.get(usuario=request.user)
                perfil.numero = form.cleaned_data['numero']
                perfil.direccion = form.cleaned_data['direccion']
                perfil.save()
            except PerfilUsuario.DoesNotExist:
                # Crear nuevo perfil si no existe
                PerfilUsuario.objects.create(
                    usuario=request.user,
                    numero=form.cleaned_data['numero'],
                    direccion=form.cleaned_data['direccion']
                )
            
            messages.success(request, "Perfil completado exitosamente")
            
            # Redirigir a donde estaba intentando ir o al catálogo
            next_url = request.session.get('next', 'catalogo')
            if 'next' in request.session:
                del request.session['next']
            
            return redirect(next_url)
    else:
        # Si el usuario ya tiene perfil, prellenamos el formulario
        initial_data = {}
        try:
            perfil = PerfilUsuario.objects.get(usuario=request.user)
            initial_data = {
                'numero': perfil.numero,
                'direccion': perfil.direccion
            }
        except PerfilUsuario.DoesNotExist:
            pass
        
        form = FormularioCompletarPerfil(initial=initial_data)
    
    return render(request, 'completar_perfil.html', {'form': form})

def custom_login_redirect(request):
    """Función para redirigir al usuario después del login, verificando si necesita completar el perfil"""
    if request.user.is_authenticated:
        try:
            # Verificar si ya existe un perfil
            PerfilUsuario.objects.get(usuario=request.user)
        except PerfilUsuario.DoesNotExist:
            # Crear un perfil vacío si no existe
            PerfilUsuario.objects.create(
                usuario=request.user,
                numero='',
                direccion=''
            )
            # Redirigir al formulario de completar perfil
            return redirect('completar_perfil')
    
    # Redirigir al catálogo si todo está en orden
    return redirect('catalogo')