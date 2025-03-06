from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import PerfilUsuario, Contacto, Pedido, ProductosPedido
from django.core.mail import send_mail
from django.conf import settings



class FormularioRegistroUsuario(UserCreationForm):
    """
    Formulario personalizado para el registro de usuarios.
    Extiende el formulario base de Django agregando campos adicionales.
    """
    email = forms.EmailField(required=True)
    numero = forms.CharField(max_length=15)
    direccion = forms.CharField(max_length=200)

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def clean_email(self):
        """
        Valida que el correo electrónico no esté ya en uso.
        """
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("Este correo electrónico ya está registrado. Por favor utiliza otro o recupera tu contraseña.")
        return email

    def save(self, commit=True):
        usuario = super().save(commit=False)
        usuario.email = self.cleaned_data["email"]
        if commit:
            usuario.save()
            PerfilUsuario.objects.create(
                usuario=usuario,
                numero=self.cleaned_data.get('numero'),
                direccion=self.cleaned_data.get('direccion')
            )
        return usuario
    
class FormularioCompletarPerfil(forms.Form):
    """
    Formulario para completar información del perfil después del registro con Google.
    """
    numero = forms.CharField(
        max_length=15,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Tu número de teléfono...'
        })
    )
    direccion = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Tu dirección completa...'
        })
    )

class FormularioContacto(forms.ModelForm):
    """
    Formulario para el envío de mensajes de contacto.
    """
    class Meta:
        model = Contacto
        fields = ('nombre', 'email', 'telefono', 'mensaje')

    def send_mail(self):
        """Método para enviar el correo con la sugerencia"""
        asunto = "Nueva Sugerencia Recibida"
        mensaje = (
            f"Has recibido una nueva sugerencia de {self.cleaned_data['nombre']} ({self.cleaned_data['email']}):\n\n"
            f"Mensaje del cliente: \n{self.cleaned_data['mensaje']}\n\n"
            f"Para contactar al usuario, llamar al número {self.cleaned_data['telefono']}\n"
            f"O enviale un correo {self.cleaned_data['email']}"
        )
        destinatario = "TiendaLuigui1@gmail.com"

        send_mail(asunto, mensaje, settings.EMAIL_HOST_USER, [destinatario])

class FormularioPasarela(forms.ModelForm):
    """
    Formulario para la pasarela de pago.
    """
    nombre = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Tu nombre aquí...'
        })
    )
    
    apellido = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Tu apellido aquí...'
        })
    )
    
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control registrado',
        })
    )
    
    telefono = forms.CharField(
        max_length=15,
        widget=forms.TextInput(attrs={
            'class': 'form-control registrado',
        })
    )
    
    direccion = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            'class': 'form-control registrado',
        })
    )
    
    MUNICIPIOS = [
        ('', 'Selecciona un municipio'),
        ('Agrado', 'Agrado'),
        ('Pital', 'Pital'),
    ]
    
    municipio = forms.ChoiceField(
        choices=MUNICIPIOS,
        widget=forms.Select(attrs={
            'class': 'form-control'
        })
    )
    
    metodo_pago = forms.ChoiceField(
        choices=Pedido.METODOS_PAGO,
        widget=forms.RadioSelect(attrs={
            'class': 'form-check-input'
        })
    )

    comprobante_pago = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={
            'class': 'form-control',
            'accept': 'image/*'
        })
    )

    class Meta:
        model = Pedido
        fields = ['nombre', 'apellido', 'email', 'telefono', 'direccion', 'municipio', 'metodo_pago', 'comprobante_pago']

    def send_order_mail(self, carrito, total):
        """Método para enviar el correo con los detalles de la orden"""
        asunto = "Nueva Orden de Pedido Recibida"
        
        # Formatear los productos del carrito
        productos_detalle = []
        for item in carrito:
            productos_detalle.append(
                f"Producto: {item['nombre']} - Cantidad: {item['cantidad']} - Precio: ${item['precio']:,.0f}"
            )
        
        productos_texto = "\n".join(productos_detalle)
        
        mensaje = (
            f"Has recibido una nueva orden de {self.cleaned_data['nombre']} ({self.cleaned_data['email']}):\n\n"
            f"Cliente: {self.cleaned_data['nombre']} {self.cleaned_data['apellido']}\n"
            f"Método de pago: {self.cleaned_data['metodo_pago']}\n\n"
            f"Productos comprados:\n{productos_texto}\n\n"
            f"Total de la compra: ${total:,.0f}"
        )
        
        destinatario = "TiendaLuigui1@gmail.com"

        send_mail(
            asunto, 
            mensaje, 
            settings.EMAIL_HOST_USER, 
            [destinatario],
            fail_silently=False
        )