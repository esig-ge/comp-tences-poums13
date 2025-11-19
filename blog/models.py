from django.db import models

class Appointment(models.Model):

    client = models.CharField(max_length=100)
    date = models.DateField()
    time = models.TimeField()
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.client} - {self.date} {self.time}"
