from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/appointments/", views.api_appointments, name="api_appointments"),
]
