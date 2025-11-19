from django.shortcuts import render, get_object_or_404, redirect
from .models import Appointment

def appointment_list(request):
    # CREATE
    if request.method == "POST":
        client = request.POST.get("client")
        date = request.POST.get("date")
        time = request.POST.get("time")
        notes = request.POST.get("notes", "")

        Appointment.objects.create(
            client=client,
            date=date,
            time=time,
            notes=notes,
        )
        return redirect("appointment_list")

    # READ
    appointments = Appointment.objects.order_by("date", "time")
    return render(request, "appointments_list.html", {"appointments": appointments})
