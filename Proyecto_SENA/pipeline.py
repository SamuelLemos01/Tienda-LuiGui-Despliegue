def verificar_perfil_completo(backend, user, response, *args, **kwargs):
    """
    Verifica si el usuario tiene un perfil completo después de la autenticación social.
    Si no lo tiene, lo redirige a la página para completar el perfil.
    """
    # Solo procesamos si el usuario existe y se autenticó por Google
    if user and backend.name == 'google-oauth2':
        from .models import PerfilUsuario
        from social_core.pipeline.partial import partial
        
        # Verificar si el usuario tiene un perfil y si tiene datos completos
        try:
            perfil = PerfilUsuario.objects.get(usuario=user)
            if not perfil.numero or not perfil.direccion:
                return {'is_new': True}
        except PerfilUsuario.DoesNotExist:
            # Si no tiene perfil, marcamos como nuevo para redirigir
            return {'is_new': True}
    
    return None