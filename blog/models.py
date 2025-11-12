from django.db import models
from django.core.validators import MinValueValidator

class Service(models.Model):
    name = models.CharField(max_length=100)
    duration_min = models.PositiveIntegerField(validators=[MinValueValidator(5)])
    price = models.DecimalField(max_digits=8, decimal_places=2)
    def __str__(self):
        return self.name

class Client(models.Model):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True)
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Reservation(models.Model):
    client = models.ForeignKey(Client, on_delete=models.PROTECT)
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    start = models.DateTimeField()
    comment = models.CharField(max_length=1000, blank=True)
    def __str__(self):
        return f"Réservation {self.client} - {self.service}"
