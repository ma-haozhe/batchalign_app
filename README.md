# batchalign_app
A front-end web app for [Batchalign2](https://github.com/TalkBank/batchalign2), with enhancements for use by the School of Psychology at Trinity College Dublin.

## Project Overview
This is a Django web application that provides a user-friendly interface for the [Batchalign](https://github.com/TalkBank/batchalign2) library, specifically tailored for the School of Psychology's needs. The app allows users to upload audio files (both single and batch uploads) and processes them using Batchalign for transcription and diarization with CHAT format support.

## Current Implementation

### Core Features
- Single file audio upload functionality
- Batch folder upload support
- Audio file processing using Batchalign
- Transcript generation in both raw and CHAT formats
- Interactive speaker mapping interface
- Support for CHAT format headers and metadata
- Automatic speaker role assignment
- Speaker diarization with customizable mapping
- Export functionality for CHAT format files
- Basic error handling and validation

### Project Structure
- `batch_processor/`: Main Django application
  - `models.py`: Database models for AudioFile, Transcript, and SpeakerMap
  - `views.py`: View logic for file handling, processing, and CHAT format generation
  - `urls.py`: URL routing
  - `templates/`: HTML templates for user interface
  - `tests.py`: Test cases for functionality

## Features

### Audio Processing
- Support for various audio file formats
- Automatic speaker diarization
- Transcript generation with speaker identification

### CHAT Format Support
- Automatic CHAT format generation
- Customizable speaker role mapping
- CHAT header metadata generation
- Support for participant information
- Export to .cha files

### User Interface
- Interactive file upload interface
- Real-time speaker mapping controls
- Toggle between raw and CHAT formats
- Batch processing status indicators
- Error feedback and validation

## Installation and Setup

### Prerequisites
- Python 3.8 or higher
- Django 3.2 or higher
- Batchalign library
- Rev.ai API key for speech recognition

### Installation Steps
1. Clone the repository:
   ```bash
   git clone [repository-url]
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   - Set up Rev.ai API key
   - Configure Django settings

4. Run migrations:
   ```bash
   python manage.py migrate
   ```

5. Start the development server:
   ```bash
   python manage.py runserver
   ```

## How to Run This Project

### Quick Start Guide
To get the application running quickly:

1. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the development server**:
   ```bash
   python manage.py runserver
   ```
   This will start the application usuallyon http://127.0.0.1:8000/

### Project Structure Explained
The project follows Django's standard structure:
- `batchalign_app/`: The main Django project container with settings and configuration
- `batch_processor/`: The actual Django app that implements the functionality
- `media/`: Directory where uploaded audio files are stored
- `staticfiles/`: Compiled static files for production

### Accessing the Application
After starting the server, you can access:
- **Home page/Upload**: http://127.0.0.1:8000/
- **File list**: http://127.0.0.1:8000/list/
- **Transcript viewer**: http://127.0.0.1:8000/transcript/{transcript_id}/

### Common Issues
- If audio files fail to process, verify your Rev.ai API key is correctly configured
- For large audio files, processing may take several minutes
- Ensure your Python environment has all dependencies from requirements.txt installed

## Usage

1. Upload Audio Files:
   - Use single file upload for individual files
   - Use batch upload for multiple files
   - Supported formats: MP3, WAV

2. Process Files:
   - Files are automatically processed using Batchalign
   - Speaker diarization is performed
   - Transcripts are generated in both raw and CHAT formats

3. Map Speakers:
   - Assign roles to identified speakers
   - Use standard CHAT format roles (e.g., MOT, CHI)
   - Update speaker mappings as needed

4. Export Results:
   - Download transcripts in CHAT format
   - Files are saved with .cha extension
   - Contains proper CHAT headers and metadata

## Development

### Setting Up Development Environment
1. Install development dependencies
2. Configure local settings
3. Set up test database

### Running Tests
```bash
python manage.py test batch_processor
```

## Future Improvements

### Priority Features
1. Enhanced User Interface:
   - Progress indicators for file processing
   - Advanced error messaging
   - Improved responsive design

2. Processing Enhancements:
   - Additional audio format support
   - Multi-language support
   - Processing queue optimization

3. Data Management:
   - Advanced transcript editing
   - Bulk file operations
   - Enhanced export options

### Technical Improvements
1. Backend Optimization:
   - Advanced error handling
   - Expanded test coverage
   - Background task processing

2. Frontend Enhancement:
   - Modern UI framework integration
   - Real-time updates
   - Advanced validation

## License
This project is licensed under the BSD-3-Clause license - see the [LICENSE](LICENSE) file for details.

## Attribution
This web application was developed by Haozhe Ma under the supervision of Dr. Jean Quigley at the School of Psychology, Trinity College Dublin. It is based on [Batchalign2](https://github.com/TalkBank/batchalign2) by TalkBank, developed by Brian MacWhinney (Carnegie Mellon University) and Houjun Liu (Stanford University).

## Citation
If you use this software in your research, please cite both this application and the original Batchalign2 software. The preferred citation for Batchalign2 is:

Liu, H., MacWhinney, B., Fromm, D., & Lanzi, A. (2023). Automation of Language Sample Analysis. *Journal of Speech, Language, and Hearing Research, 66*(7), 2421-2433. DOI: [10.1044/2023_JSLHR-22-00642](https://doi.org/10.1044/2023_JSLHR-22-00642)

For more information, see the [CITATION.cff](CITATION.cff) file.

