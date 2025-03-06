from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models
from django.contrib.auth.models import User

class PerfilUsuario(models.Model):
    """
    Modelo que extiende la información del usuario base de Django.
    Permite agregar campos adicionales como número de teléfono y dirección.
    """
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    numero = models.CharField(max_length=15)
    direccion = models.CharField(max_length=200)

    def __str__(self):
        return self.usuario.username

class Contacto(models.Model):
    """
    Modelo para almacenar los mensajes de contacto de los usuarios.
    """
    nombre = models.CharField(max_length=60)
    email = models.EmailField()
    telefono = models.CharField(max_length=11)
    mensaje = models.TextField()

    def __str__(self):
        return self.nombre

class Producto(models.Model):
    """
    Modelo principal para los productos de la tienda.
    Incluye información básica del producto y métodos para gestionar el inventario.
    """
    CATEGORIAS = [
        ('aseo', 'Aseo'),
        ('comestibles', 'Comestibles'),
        ('canasta_familiar', 'Canasta Familiar'),
        ('papeleria', 'Papelería'),
    ]

    nombre = models.CharField(max_length=200, verbose_name="Nombre")
    descripcion = models.TextField(verbose_name="Descripción")
    precio = models.DecimalField(max_digits=10, decimal_places=0, verbose_name="Precio")
    categoria = models.CharField(max_length=20, choices=CATEGORIAS, verbose_name="Categoría")
    imagen = models.ImageField(upload_to='productos/', verbose_name="Imagen")
    disponible = models.BooleanField(default=True, verbose_name="Disponible")

    def verificar_stock(self, cantidad):
        """
        Verifica si hay suficiente stock para una cantidad solicitada.
        """
        try:
            return self.inventario.unidades_totales >= cantidad
        except Inventario.DoesNotExist:
            return False
            
    def obtener_unidades_disponibles(self):
        """
        Retorna el número de unidades disponibles en inventario.
        """
        try:
            return self.inventario.unidades_totales
        except Inventario.DoesNotExist:
            return 0

    def __str__(self):
        return self.nombre
        
class Inventario(models.Model):
    """
    Modelo para gestionar el inventario de cada producto.
    Mantiene un registro de las unidades disponibles y su última actualización.
    """
    producto = models.OneToOneField(Producto, on_delete=models.CASCADE, related_name='inventario')
    unidades_totales = models.PositiveIntegerField(default=0, verbose_name="Total de unidades")
    
    def disminuir_stock(self, cantidad):
        """
        Reduce el stock en la cantidad especificada.
        Retorna True si la operación fue exitosa, False si no hay suficiente stock.
        """
        if self.unidades_totales >= cantidad:
            self.unidades_totales -= cantidad
            self.save()
            return True
        return False

    def aumentar_stock(self, cantidad):
        """
        Aumenta el stock en la cantidad especificada.
        """
        self.unidades_totales += cantidad
        self.save()

    def __str__(self):
        return f"Inventario de {self.producto.nombre}: {self.unidades_totales} unidades"

class CarritoCompra(models.Model):
    """
    Modelo para el carrito de compras.
    Relaciona usuarios con productos y sus cantidades.
    """
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    productos = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.usuario.username} - {self.productos.nombre}"

class Pedido(models.Model):
    """
    Modelo para los pedidos de compra.
    Almacena toda la información necesaria para procesar un pedido.
    """
    METODOS_PAGO = [
        ('bancolombia', 'Bancolombia'),
        ('nequi', 'Nequi'),
        ('daviplata', 'DaviPlata'),
    ]
    
    ESTADOS_PEDIDO = [
        ('pendiente', 'Pendiente'),
        ('confirmado', 'Confirmado'),
        ('en_proceso', 'En Proceso'),
        ('enviado', 'Enviado'),
        ('entregado', 'Entregado'),
        ('cancelado', 'Cancelado'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    nombre = models.CharField(max_length=200)
    apellido = models.CharField(max_length=200)
    direccion = models.CharField(max_length=200)
    telefono = models.CharField(max_length=15)
    email = models.EmailField()
    municipio = models.CharField(max_length=100)
    metodo_pago = models.CharField(max_length=20, choices=METODOS_PAGO)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, default=3000)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=20, choices=ESTADOS_PEDIDO, default='pendiente')
    comprobante_pago = models.ImageField(upload_to='comprobantes/', null=True, blank=True, verbose_name="Comprobante de pago")
    def __str__(self):
        return f"Pedido #{self.id} - {self.usuario.username}"

class ProductosPedido(models.Model):
    """
    Modelo para los productos incluidos en un pedido.
    Almacena la cantidad y precios de cada producto en un pedido específico.
    """
    pedido = models.ForeignKey(Pedido, related_name='items', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para calcular automáticamente el subtotal
        antes de guardar el objeto.
        """
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre} en Pedido #{self.pedido.id}"
    
class HistorialPedidos(models.Model):
    """
    Modelo para mantener un historial de todos los pedidos realizados.
    Proporciona un resumen rápido de las compras anteriores.
    """
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, null=True, blank=True)  # Permite valores nulos temporalmente
    fecha_compra = models.DateTimeField(auto_now_add=True)
    numero_productos = models.IntegerField()
    compra_total = models.DecimalField(max_digits=10, decimal_places=0)
    numero_pedido = models.CharField(max_length=10)

    def __str__(self):
        return f"Pedido #{self.numero_pedido} - {self.usuario.username}"
    
@receiver(post_save, sender=Producto)
def crear_inventario(sender, instance, created, **kwargs):
    if created:
        Inventario.objects.create(producto=instance, unidades_totales=0)