from django.shortcuts import redirect
from .models import PerfilUsuario
from django.urls import resolve

class PerfilCompletoMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Si el usuario está autenticado
        if request.user.is_authenticated:
            # Ignoramos ciertas URLs para evitar redirecciones en bucle
            current_url = resolve(request.path_info).url_name
            excluded_urls = ['completar_perfil', 'logout_perfil', 'admin:index']
            
            if current_url not in excluded_urls:
                try:
                    # Verificar si el perfil está completo
                    perfil = PerfilUsuario.objects.get(usuario=request.user)
                    if not perfil.numero or not perfil.direccion:
                        # Guarda la URL a la que intentaba acceder
                        request.session['next'] = request.get_full_path()
                        return redirect('completar_perfil')
                except PerfilUsuario.DoesNotExist:
                    # Si no tiene perfil, redirigir al formulario
                    request.session['next'] = request.get_full_path()
                    return redirect('completar_perfil')
        
        response = self.get_response(request)
        return response