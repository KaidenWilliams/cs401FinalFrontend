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

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm (v8 or later)

### Installation

1. Clone this repository or download the source code
2. Navigate to the project directory
3. Install the dependencies:

```bash
npm install
```

### Running Locally

Start the development server:

```bash
npm run dev
```

This will launch the application in development mode. Open your browser and navigate to `http://localhost:5173` (or the port indicated in the terminal).

### Configuration

To use your own API endpoint for bird identification:

1. Open the `src/config.js` file
2. Update the `API_ENDPOINT` value with your AWS API Gateway URL
3. Update the `API_KEY` value with your API key if required
4. Adjust other configuration parameters as needed:
   - `MAX_FILE_SIZE`: Maximum allowed file size for uploads
   - `AUDIO.TARGET_FORMAT`: Target format for audio conversion
   - `AUDIO.QUALITY`: Audio quality for conversion
   - `AUDIO.SAMPLE_RATE`: Sample rate for audio conversion

## Building for Production

To create a production build:

```bash
npm run build
```

This will generate optimized files in the `dist` directory, ready for deployment to a static hosting service.

## Deployment

### Deploying to GitHub Pages

1. Install the gh-pages package:
   ```bash
   npm install gh-pages --save-dev
   ```

2. Add the following to your `package.json`:
   ```json
   {
     "homepage": "https://yourusername.github.io/your-repo-name",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

### Deploying to Other Static Hosting Services

This website can be deployed to any static hosting service such as:

- **Netlify**: Connect your GitHub repository or upload the `dist` directory manually
- **Vercel**: Connect your GitHub repository for automatic deployments
- **AWS S3**: Upload the contents of the `dist` directory to an S3 bucket configured for static website hosting
- **Firebase Hosting**: Use the Firebase CLI to deploy the `dist` directory

## API Integration

The application expects the AWS Lambda function to:
1. Accept a POST request with an OGG audio file
2. Process the audio to identify bird species
3. Return a JSON response with an array of identified species and confidence levels:

```json
{
  "species": [
    { "name": "Northern Cardinal", "confidence": 0.92 },
    { "name": "American Robin", "confidence": 0.65 }
  ]
}
```

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.
