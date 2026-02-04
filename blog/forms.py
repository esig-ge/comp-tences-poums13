from django import forms
from .models import Appointment
from datetime import date as dt_date, datetime

class AppointmentForm(forms.ModelForm):
    class Meta:
        model = Appointment
        fields = ["client", "date", "time", "notes"]
        widgets = {
            "client": forms.TextInput(attrs={"placeholder": "Nom du client"}),
            "date": forms.DateInput(attrs={"type": "date"}),
            "time": forms.TimeInput(attrs={"type": "time"}),
            "notes": forms.Textarea(attrs={"rows": 4}),
        }

    def clean_client(self):
        client = self.cleaned_data["client"].strip()
        if len(client) < 2:
            raise forms.ValidationError("Le nom du client doit contenir au moins 2 caractères.")
        return client

    def clean_date(self):
        d = self.cleaned_data["date"]
        if d < dt_date.today():
            raise forms.ValidationError("Date invalide.")
        return d

    def clean_time(self):
        t = self.cleaned_data["time"]
        d = self.cleaned_data.get("date")

        # Si on a la date et que c'est aujourd'hui => refuser heure passée
        if d == dt_date.today():
            now_time = datetime.now().time().replace(second=0, microsecond=0)
            if t < now_time:
                raise forms.ValidationError("Heure invalide.")
        return t
