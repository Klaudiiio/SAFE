from django.contrib import admin
from .models import (
    AdminAccount,
    DemoAccountProfile,
    IncidentType,
    Location,
    EmergencyReport,
    ResponderAccount,
    IncidentNotification,
    ResponderNotification,
    ClinicCaseNote,
    CaseMessage,
    IncidentLog,
)

admin.site.register(AdminAccount)
admin.site.register(DemoAccountProfile)
admin.site.register(IncidentType)
admin.site.register(Location)
admin.site.register(EmergencyReport)
admin.site.register(ResponderAccount)
admin.site.register(IncidentNotification)
admin.site.register(ResponderNotification)
admin.site.register(ClinicCaseNote)
admin.site.register(CaseMessage)
admin.site.register(IncidentLog)