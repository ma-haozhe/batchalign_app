# Generated by Django 3.2.16 on 2025-02-26 12:52

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('batch_processor', '0004_alter_speakermap_display_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='speakermap',
            name='display_name',
        ),
    ]
