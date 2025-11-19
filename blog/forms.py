from django import forms
from .models import Appointment
from datetime import date

class AppointmentForm(forms.ModelForm):
    class Meta:
        model = Appointment
        fields = ["client", "date", "time", "notes"]

        widgets = {
            "client": forms.TextInput(attrs={
                "placeholder": "Nom du client",
            }),
            "date": forms.DateInput(
                attrs={
                    "type": "date",
                }
            ),
            "time": forms.TimeInput(
                attrs={
                    "type": "time",
                }
            ),
            "notes": forms.Textarea(attrs={
                "rows": 4,
            }),
        }

    def clean_client(self):
        client = self.cleaned_data["client"].strip()
        if len(client) < 2:
            raise forms.ValidationError("Le nom du client doit contenir au moins 2 caractères.")
        return client

    def clean_date(self):
        d = self.cleaned_data["date"]
        if d < date.today():
            raise forms.ValidationError("La date ne peut pas être dans le passé.")
        return d
