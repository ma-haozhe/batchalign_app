#Haozhe Ma 2024-Dec-11

from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
import os

class UploadAudioViewTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_single_file_upload(self):
        with open("test.mp3", "wb") as f:
            f.write(b"dummy audio content")
        with open("test.mp3", "rb") as f:
            response = self.client.post("/upload/", {"audio_file": f})
        os.remove("test.mp3")
        self.assertEqual(response.status_code, 200)
        self.assertIn("audio_id", response.json())

    def test_batch_folder_upload(self):
        os.makedirs("test_batch", exist_ok=True)
        with open("test_batch/test1.mp3", "wb") as f:
            f.write(b"dummy audio content")
        with open("test_batch/test2.wav", "wb") as f:
            f.write(b"dummy audio content")

        with open("test_batch/test1.mp3", "rb") as file1, open("test_batch/test2.wav", "rb") as file2:
            response = self.client.post(
                "/upload/",
                {"input_folder": [file1, file2]}
            )
        os.remove("test_batch/test1.mp3")
        os.remove("test_batch/test2.wav")
        os.rmdir("test_batch")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())