from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import EmergencyReport
from .serializers import EmergencyReportSerializer


@api_view(["GET"])
def health_check(request):
    return Response({
        "status": "ok",
        "service": "SAFE backend",
        "message": "Django API is running and connected to the SAFE emergency workflow.",
    })


@api_view(["GET", "POST"])
def report_list_create(request):
    if request.method == "GET":
        reports = EmergencyReport.objects.all()
        serializer = EmergencyReportSerializer(reports, many=True)
        return Response(serializer.data)

    serializer = EmergencyReportSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    report = serializer.save(status="submitted", response_eta_minutes=5)
    return Response(EmergencyReportSerializer(report).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
def report_detail(request, pk):
    try:
        report = EmergencyReport.objects.get(pk=pk)
    except EmergencyReport.DoesNotExist:
        return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = EmergencyReportSerializer(report)
        return Response(serializer.data)

    serializer = EmergencyReportSerializer(report, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(serializer.data)
