from django.urls import path
from . import views

urlpatterns = [
    path("appointments/", views.appointment_list, name="appointment_list"),          # READ + CREATE
    path("appointments/<int:pk>/edit/", views.appointment_edit, name="appointment_edit"),  # UPDATE
    path("appointments/<int:pk>/delete/", views.appointment_delete, name="appointment_delete"),  # DELETE
]
