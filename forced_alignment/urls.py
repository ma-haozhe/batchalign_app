# filepath: /Users/haozhema/batchalign_app/forced_alignment/urls.py
from django.urls import path
from . import views

app_name = 'forced_alignment'

urlpatterns = [
    # Main page for the forced alignment feature
    path('', views.index, name='index'),
    
    # Detail page to see the results of an alignment task
    path('task/<int:task_id>/', views.alignment_detail, name='detail'),
    
    # API endpoint to start an alignment task
    path('api/start/', views.start_alignment, name='start_alignment'),
    
    # API endpoint to check the status of an alignment task
    path('api/status/<int:task_id>/', views.check_alignment_status, name='check_status'),
]
