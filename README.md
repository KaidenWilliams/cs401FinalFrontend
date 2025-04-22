# Bird Audio Identification Website

A modern, responsive web application for identifying bird species through audio analysis. Users can upload audio recordings of bird songs or calls, which are processed to identify the bird species.

## Features

- Upload audio recordings in various formats (MP3, WAV, M4A, WebM, etc.)
- Client-side audio conversion to OGG format before processing
- Integration with AWS Lambda via API Gateway for bird identification
- Responsive design for both desktop and mobile devices
- Drag-and-drop file upload support

## Tech Stack

- **Frontend**: React with Vite
- **Styling**: CSS
- **Audio Processing**: FFmpeg (via WebAssembly)
- **API Communication**: Axios
- **File Upload**: react-dropzone


## Browser Compatibility

This application uses modern web technologies and is compatible with:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

Some older browsers may not support all features, particularly the audio conversion functionality.

## Development Notes

- The application uses FFmpeg compiled to WebAssembly to handle audio conversion on the client-side
- Mock data is provided for testing when the API endpoint is not available
- The UI is designed to be responsive and work well on both desktop and mobile devices
