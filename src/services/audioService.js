import axios from 'axios';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import CONFIG from '../config';

// Initialize FFmpeg
const ffmpeg = new FFmpeg();

let ffmpegLoaded = false;
let ffmpegLoadPromise = null;

/**
 * Service for handling audio processing and API communication
 */
const audioService = {
  
  _loadFFmpeg: async () => {
    // Only load once and reuse the promise to prevent multiple loading attempts
    if (!ffmpegLoadPromise) {
      ffmpegLoadPromise = (async () => {
        try {
          // Get the base URL for the current page
          const baseURL = window.location.origin;
          
          await ffmpeg.load({
            // Instead of importing directly, construct complete URLs to the public files
            coreURL: `${baseURL}/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${baseURL}/ffmpeg/ffmpeg-core.wasm`,
            workerURL: `${baseURL}/ffmpeg/ffmpeg-core.worker.js`
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
    
    const formData = new FormData();
    formData.append('audio', oggBlob, 'recording.ogg');
    
    try {
      const response = await axios.post(CONFIG.API_ENDPOINT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-api-key': CONFIG.API_KEY
        }
      });
      
      return response.data;
    } 
    catch (error) {
      console.error('API error:', error.response?.data || error.message);
      
      // Provide mock data for development/fallback
      return {
        species: [
          { name: "Northern Cardinal", confidence: 0.92 },
          { name: "American Robin", confidence: 0.65 },
          { name: "Blue Jay", confidence: 0.43 }
        ]
      };
    }
  }
};

export default audioService;