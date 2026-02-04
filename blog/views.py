import json
import re
from datetime import date, timedelta

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.utils.dateparse import parse_date
import requests
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST

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
    return {
        "id": appt.id,
        "client": appt.client,
        "date": appt.date.isoformat(),
        "date_display": appt.date.strftime("%d/%m/%Y"),
        "time": appt.time.strftime("%H:%M"),
        "notes": appt.notes or "",
    }


@require_GET
def api_appointments(request):
    qs = Appointment.objects.order_by("date", "time")

    date_str = request.GET.get("date")
    if date_str:
        date_obj = parse_date(date_str)
        if date_obj:
            qs = qs.filter(date=date_obj)

    client = request.GET.get("client")
    if client:
        qs = qs.filter(client__icontains=client)

    data = [serialize_appointment(a) for a in qs]
    return JsonResponse({"appointments": data})


# --------------------------------------------------
# COPILOT IA (endpoint appelé par barber.js)
# POST /copilot/parse/
# Body: {"text": "..."}
# Retour: {"client": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "notes": "..."}
# --------------------------------------------------
@require_POST
def copilot_parse(request):
    try:
        body = json.loads(request.body.decode("utf-8"))
        user_text = (body.get("text") or "").strip()
    except Exception:
        return JsonResponse({"error": "JSON invalide"}, status=400)

    if not user_text:
        return JsonResponse({
            "client": "",
            "date": "",
            "time": "",
            "notes": ""
        })

    # 🔹 Prompt STRICT (important)
    prompt = f"""
Tu es un assistant pour un salon de coiffure.

À partir du texte utilisateur, retourne UNIQUEMENT un JSON valide
sans texte autour, sans markdown, sans explication.

Format EXACT attendu :
{{
  "client": "Nom",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "notes": "texte libre"
}}

Texte utilisateur :
\"\"\"{user_text}\"\"\"
"""

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",   # ou "mistral"
                "prompt": prompt,
                "stream": False
            },
            timeout=15
        )
    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": "Ollama injoignable", "details": str(e)}, status=500)

    try:
        raw = response.json()["response"].strip()
        data = json.loads(raw)
    except Exception:
        return JsonResponse({
            "error": "Réponse IA invalide",
            "raw": response.text
        }, status=500)

    # Sécurisation des champs
    result = {
        "client": data.get("client", ""),
        "date": data.get("date", ""),
        "time": data.get("time", ""),
        "notes": data.get("notes", ""),
    }

    return JsonResponse(result)