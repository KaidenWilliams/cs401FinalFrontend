import axios from 'axios';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import CONFIG from '../config';

// Initialize FFmpeg
const ffmpeg = new FFmpeg();
const CHUNK_DURATION = 5; // seconds

let ffmpegLoaded = false;
let ffmpegLoadPromise = null;

/**
 * Service for handling audio processing and API communication
 */
const audioService = {
  // Convert a Blob to Base64 string
  blobToBase64: (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
  
  _loadFFmpeg: async () => {
    // Only load once and reuse the promise to prevent multiple loading attempts
    if (!ffmpegLoadPromise) {
      ffmpegLoadPromise = (async () => {
        try {
          // Get the base URL for the current page from Vite's import.meta.env.BASE_URL
          // This will be '/' in development and '/cs401FinalFrontend/' in production
          const baseURL = import.meta.env.BASE_URL || '/';
          
          // In Vite, we need to access files in the public folder via root path
          await ffmpeg.load({
            // Use absolute paths from the root instead of importing
            coreURL: new URL(`${baseURL}ffmpeg/ffmpeg-core.js`, window.location.href).href,
            wasmURL: new URL(`${baseURL}ffmpeg/ffmpeg-core.wasm`, window.location.href).href,
            workerURL: new URL(`${baseURL}ffmpeg/ffmpeg-core.worker.js`, window.location.href).href
          });
          
          ffmpegLoaded = true;
          console.log('FFmpeg loaded successfully');
        } catch (error) {
          console.error('Error loading FFmpeg:', error);
          throw new Error('Failed to load audio processing library');
        }
      })();
    }
    
    return ffmpegLoadPromise;
  },

  convertToOgg: async (file) => {
    // Load FFmpeg if not already loaded
    if (!ffmpegLoaded) {
      await audioService._loadFFmpeg();
    }
    
    try {
      // Use simple fixed filenames to reduce complexity
      const isVideo = file.type.startsWith('video/');
      const inputFileName = isVideo ? 'input.mp4' : 'input.webm';
      const outputFileName = 'output.ogg';
      
      // Write the file to FFmpeg's file system
      const fileData = await fetchFile(file);
      console.log(`Input file size: ${fileData.byteLength} bytes, type: ${file.type}`);
      await ffmpeg.writeFile(inputFileName, fileData);
      
      // List files before conversion
      const filesBefore = await ffmpeg.listDir('/');
      console.log('Files before conversion:', filesBefore);
      
      try {
        // Run FFmpeg with appropriate commands based on file type
        if (isVideo) {
          console.log('Extracting audio from video file...');
          
          // Extract audio from video
          await ffmpeg.exec([
            '-loglevel', 'verbose',
            '-i', inputFileName,
            '-t', CHUNK_DURATION.toString(),
            '-vn',                 // No video
            '-acodec', 'libvorbis', // Audio codec for OGG
            '-q:a', '4',           // Audio quality
            '-ar', '44100',        // Audio sample rate
            outputFileName
          ]);
        } else {
          // Standard audio conversion
          await ffmpeg.exec([
            '-loglevel', 'verbose',
            '-t', CHUNK_DURATION.toString(),
            '-i', inputFileName,
            '-c:a', 'libvorbis', 
            outputFileName
          ]);
        }
        
        // Try to read any error output
        try {
          const stderr = await ffmpeg.readFile('stderr');
          if (stderr && stderr.length > 0) {
            console.log('FFmpeg log:', new TextDecoder().decode(stderr));
          }
        } catch (stderrError) {
          console.log('No FFmpeg stderr output available');
        }
        
        // List files after conversion to verify output was created
        const filesAfter = await ffmpeg.listDir('/');
        console.log('Files after conversion:', filesAfter);
        
        // Check if output file exists in the list
        const outputExists = filesAfter.some(file => file.name === outputFileName);
        if (!outputExists) {
          console.error('Output file was not created by FFmpeg');
          throw new Error('FFmpeg conversion failed to create output file');
        }
        
        // Read the output file
        const data = await ffmpeg.readFile(outputFileName);
        console.log(`Output file size: ${data.byteLength} bytes`);
        
        if (data.byteLength === 0) {
          throw new Error('FFmpeg produced an empty output file');
        }
        
        // Create a blob from the output data
        const blob = new Blob([data], { type: 'audio/ogg' });
        
        // Cleanup files
        try {
          await ffmpeg.deleteFile(inputFileName);
          await ffmpeg.deleteFile(outputFileName);
        } catch (cleanupError) {
          console.warn('Error during cleanup:', cleanupError);
          // Non-fatal error, continue
        }
        
        return blob;
      } catch (ffmpegError) {
        console.error('FFmpeg execution error:', ffmpegError);
        
        // Try to get more diagnostic information
        const filesAfterError = await ffmpeg.listDir('/').catch(() => []);
        console.log('Files after error:', filesAfterError);
        
        throw new Error(`FFmpeg conversion failed: ${ffmpegError.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error converting audio:', error);
      throw new Error('Failed to convert audio format');
    }
  },


  identifyBird: async (oggBlob) => {
    // Create a short preview URL to verify the audio blob is valid
    const previewUrl = URL.createObjectURL(oggBlob);
    console.log('Audio preview URL:', previewUrl);

    // Convert the blob to base64 string
    const audioBase64 = await audioService.blobToBase64(oggBlob);

    const payload = {
      filename: 'recording.ogg', 
      contentType: oggBlob.type || 'audio/ogg', 
      audio_base64: audioBase64 
    };
    
    try {

      const response = await axios.post(CONFIG.API_ENDPOINT, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('API response:', response);

      const parsedData = JSON.parse(response.data);

      const formattedResults = parsedData.data.top5_labels.map((label, index) => ({
        name: label,
        confidence: response.data.top5_probs[index]
      }));
      return {species: formattedResults};
    } 
    catch (error) {
      console.error('API error:', error.response?.data || error.message);
      
      // Provide mock data for development/fallback
      return {species: []};
    }
  }
};

export default audioService;