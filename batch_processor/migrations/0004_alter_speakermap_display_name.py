# Generated by Django 3.2.16 on 2025-02-26 12:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('batch_processor', '0003_auto_20250226_1005'),
    ]

    operations = [
        migrations.AlterField(
            model_name='speakermap',
            name='display_name',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
