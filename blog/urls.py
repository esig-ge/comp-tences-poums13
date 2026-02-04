from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/appointments/", views.api_appointments, name="api_appointments"),

    # Copilot IA
    path("copilot/parse/", views.copilot_parse, name="copilot_parse"),
]
