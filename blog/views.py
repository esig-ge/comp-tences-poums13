from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Appointment
from .forms import AppointmentForm


def index(request):
    if request.method == "POST" and "delete_id" in request.POST:
        Appointment.objects.filter(id=request.POST["delete_id"]).delete()
        return redirect("index")

    form = None

    if request.method == "POST" and "delete_id" not in request.POST:
        appt_id = request.POST.get("id")

        if appt_id:
            appt = Appointment.objects.get(pk=appt_id)
            form = AppointmentForm(request.POST, instance=appt)
        else:
            form = AppointmentForm(request.POST)

        if form.is_valid():
            form.save()
            return redirect("index")

    if form is None:
        form = AppointmentForm()

    appointments = Appointment.objects.order_by("date", "time")
    return render(request, "blog/index.html", {
        "appointments": appointments,
        "form": form,
    })


def serialize_appointment(appt: Appointment) -> dict:
    """
    Convertit un Appointment en dictionnaire JSON-sérialisable.
    """
    return {
        "id": appt.id,
        "client": appt.client,
        "date": appt.date.isoformat(),              # ex: 2025-11-26
        "date_display": appt.date.strftime("%d/%m/%Y"),
        "time": appt.time.strftime("%H:%M"),
        "notes": appt.notes or "",
    }


@require_GET
def api_appointments(request):
    """
    Vue API AJAX (GET) :
    - Lit les rendez-vous en base
    - Les renvoie sous forme JSON structuré (liste d'objets)
    -> Coche le critère : "Au moins un appel Ajax dialogue avec la base de données".
    """
    appointments = Appointment.objects.order_by("date", "time")
    data = [serialize_appointment(a) for a in appointments]
    return JsonResponse({"appointments": data})
