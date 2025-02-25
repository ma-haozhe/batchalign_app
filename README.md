# batchalign_app

A frontend web app for batchalign and some improvements for school of psychology use.

## Project Overview

This is a Django web application that provides a user-friendly interface for the Batchalign library, specifically tailored for the School of Psychology's needs. The app allows users to upload audio files (both single and batch uploads) and processes them using Batchalign for transcription and diarization.

## Current Implementation

### Core Features
- Single file audio upload functionality
- Batch folder upload support
- Audio file processing using Batchalign
- Transcript generation and storage
- Basic error handling for processing failures

### Project Structure
- `batch_processor/`: Main Django application
  - `models.py`: Database models for AudioFile and Transcript
  - `views.py`: View logic for file handling and processing
  - `urls.py`: URL routing
  - `templates/`: HTML templates
  - `tests.py`: Test cases for functionality

## TODO List

### Priority Features
1. Implement user interface improvements:
   - Progress indicators for file processing
   - Better error messaging and user feedback
   - Responsive design for the upload interface

2. Enhance file processing:
   - Support for multiple audio formats
   - Language selection for transcription
   - Batch processing optimization

3. Data Management:
   - Implement transcript viewing and editing
   - Add file management capabilities (delete, update)
   - Export functionality for transcripts

### Technical Improvements
1. Backend Development:
   - Improve error handling and logging
   - Add additional test coverage
   - Implement background task processing for large files

2. Frontend Development:
   - Add modern UI framework integration
   - Implement real-time processing updates
   - Add file upload validation

3. Security and Performance:
   - Add user authentication
   - Implement file size limitations
   - Add caching for better performance

## Installation

(TODO: Add installation instructions)

## Usage

(TODO: Add usage instructions)

## Development Setup

(TODO: Add development setup instructions)
