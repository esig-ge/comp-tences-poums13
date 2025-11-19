from django.shortcuts import render, redirect
from .models import Appointment
from .forms import AppointmentForm

def index(request):
    # SUPPRESSION
    if request.method == "POST" and "delete_id" in request.POST:
        Appointment.objects.filter(id=request.POST["delete_id"]).delete()
        return redirect("index")

    form = None

    # AJOUT / MODIFICATION AVEC VALIDATION
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
        # si invalide → redisplay avec erreurs

    if form is None:
        form = AppointmentForm()

    appointments = Appointment.objects.order_by("date", "time")
    return render(request, "blog/index.html", {
        "appointments": appointments,
        "form": form,
    })
