"""
URL configuration for Sitio project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from Proyecto_SENA import views
from django.conf import settings
from django.conf.urls.static import static
from Proyecto_SENA.views import catalogo
from Proyecto_SENA.views import api_productos

urlpatterns = [
    path('admin/', admin.site.urls),
    path('social-auth/',include('social_django.urls', namespace='social')),
    path('',views.inicio,name='inicio'),
    path('galeria/',views.galeria,name='galeria'),
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('perfil/', views.perfil, name='perfil'),
    path('catalogo/',catalogo, name='catalogo'),
    path('api/productos/', api_productos, name='api_productos'),
    path('logout/', views.logout_perfil, name='logout'),
    path('api/productos/', views.get_products, name='get_products'),
    path('contact/', views.contact, name='contact'),
    path('carrito/', views.carrito, name='carrito'),
    path('pasarela/', views.pasarela, name='pasarela'),
    path('api/usuario-info/', views.usuario_info, name='usuario_info'),
    path('message-pasarela/', views.MessagePasarela, name='MessagePasarela'),
    path('historial/', views.history, name='historial'),
    path('manual/', views.manual, name='manual'),
    path('restablecer/', views.restablecer, name='restablecer'),
    path('cambiar_contrasena/<uidb64>/<token>/', views.cambiar_contrasena, name='cambiar_contrasena'),
    path('confirmacion_contrasena/', views.confirmacion_contrasena, name='confirmacion_contrasena'), 
    path('completar-perfil/', views.completar_perfil, name='completar_perfil'),
    path('auth/redirect/', views.custom_login_redirect, name='custom_login_redirect'),
] 
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)




