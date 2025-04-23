import { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import audioService from './services/audioService';
import CONFIG from './config';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  
  // Refs for recording functionality
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/*': [],
      'video/*': []
    },
    maxSize: CONFIG.MAX_FILE_SIZE,
    multiple: false,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        handleFileSelection(acceptedFiles[0]);
      }
    },
    onDropRejected: fileRejections => {
      const rejection = fileRejections[0];
      console.error('File rejected:', rejection);
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      } else {
        setError('Please upload a valid audio or video file.');
      }
    }
  });

  const handleFileSelection = async (file) => {
    setFile(file);
    setIsProcessing(true);
    setError(null);
    setResults(null);
    setProcessingStep('Reading file...');
    
    try {
      // Create URL for audio preview so users can listen to the uploaded file
      const audioURL = URL.createObjectURL(file);
      setAudioUrl(audioURL);
      
      await processAudioBlob(file);
    } catch (err) {
      console.error('Error processing audio file:', err);
      setError(err.message || 'Failed to process audio file');
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    // Clean up the audioURL by revoking the object URL to prevent memory leaks
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    audioChunksRef.current = [];
    
    // Reset all state variables
    setRecordingTime(0);
    setFile(null);
    setAudioUrl(null);
    setIsProcessing(false);
    setProcessingStep('');
    setResults(null);
    setError(null);
    setIsRecording(false);
  };

  // Start recording from microphone
  const startRecording = async () => {
    try {
      setError(null);
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder with appropriate mime type
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`Received audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start recording - request data every 1 second while recording
      mediaRecorder.start(1000);
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingTime(seconds);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please ensure you have granted microphone permissions.');
    }
  };
  
  // Stop recording
  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    
    try {
      // We need to wait for the final dataavailable event before processing
      await new Promise((resolve) => {
        // Add event handler for when recording actually stops
        mediaRecorderRef.current.addEventListener('stop', () => {
          console.log(`Recording stopped. Total chunks: ${audioChunksRef.current.length}`);
          resolve();
        });
        
        // Request final chunk of data and stop recording
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
        
        // Stop all audio tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      });
      
      // Clear timer
      clearInterval(timerRef.current);
      setIsRecording(false);
      
      // Process recorded audio
      setIsProcessing(true);
      setProcessingStep('Processing recording...');
      
      // Verify we have audio data
      if (audioChunksRef.current.length === 0 || 
          audioChunksRef.current.every(chunk => chunk.size === 0)) {
        throw new Error('No audio was recorded. Please try again.');
      }
      
      // Create blob from recorded chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log(`Final audio size: ${audioBlob.size} bytes`);
      
      // Create URL for audio preview (optional)
      const audioURL = URL.createObjectURL(audioBlob);
      setAudioUrl(audioURL);
      
      // Process the recording just like a file upload
      await processAudioBlob(audioBlob);
      
    } catch (err) {
      console.error('Error processing recording:', err);
      setError(err.message || 'Failed to process audio recording');
      setIsProcessing(false);
    }
  };
  
  // Common function to process audio blob (from file upload or recording)
  const processAudioBlob = async (audioBlob) => {
    try {
      // Check if the file is already in OGG format
      let oggBlob;
      if (audioBlob.type === 'audio/ogg' || 
          audioBlob.type === 'application/ogg' || 
          (audioBlob.name && audioBlob.name.toLowerCase().endsWith('.ogg'))) {
        // Skip conversion for OGG files
        console.log('File is already in OGG format, skipping conversion');
        setProcessingStep('File is already in OGG format, skipping conversion...');
        oggBlob = audioBlob;
      } else {
        // Convert to OGG format
        setProcessingStep('Converting to OGG format...');
        console.log(`Converting file of type ${audioBlob.type} to OGG format`);
        oggBlob = await audioService.convertToOgg(audioBlob);
      }
      
      // Send to API for identification
      setProcessingStep('Identifying bird species...');
      const identificationResults = await audioService.identifyBird(oggBlob);
      
      // Set results
      setResults(identificationResults);
      setIsProcessing(false);
      
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err.message || 'Failed to process audio');
      setIsProcessing(false);
    }
  };

  // Format seconds to display as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="app-container">
      <header>
        <h1>Bird Audio Identifier</h1>
        <p>Upload an audio recording or record directly to identify bird species</p>
      </header>

      <main>
        {!file && !isProcessing && !results && !isRecording && (
          <>
            <div className="tab-container">
              <button 
                className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                Upload Audio
              </button>
              <button 
                className={`tab-button ${activeTab === 'record' ? 'active' : ''}`}
                onClick={() => setActiveTab('record')}
              >
                Record Audio
              </button>
            </div>
            
            {activeTab === 'upload' && (
              <div className="tab-content">
                <div 
                  className={`upload-container ${isDragActive ? 'active' : ''}`}
                  {...getRootProps()}
                >
                  <div className="upload-icon">
                    <i className="microphone-icon"></i>
                  </div>
                  <div className="upload-text">
                    <p>Drag & drop audio file here</p>
                    <p>OR</p>
                    <button className="upload-button">Choose File</button>
                    <input {...getInputProps()} />
                  </div>
                  <p className="file-formats">
                    Supported formats: .mp3, .wav, .m4a, .webm, .mp4, .mov and other audio/video formats
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'record' && (
              <div className="tab-content">
                <div className="record-container">
                  <p>Record bird sounds with your microphone</p>
                  <p className="record-instructions">Click the button below to start recording</p>
                  <button 
                    className="record-button" 
                    onClick={startRecording}
                  >
                    Start Recording
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {isRecording && (
          <div className="recording-container">
            <div className="recording-indicator">Recording...</div>
            <div className="recording-time">{formatTime(recordingTime)}</div>
            <button 
              className="stop-recording-button"
              onClick={stopRecording}
            >
              Stop Recording
            </button>
          </div>
        )}

        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="upload-button" onClick={handleReset}>
              Try Again
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="processing-container">
            <div className="loader"></div>
            <p className="processing-status">{processingStep}</p>
          </div>
        )}

        {results && (
          <div className="results-container">
            <h2>Potential Bird Species</h2>
            <div className="bird-results">
              {results.species && results.species.length > 0 ? (
                results.species
                  .filter(bird => bird.confidence > 0.1)
                  .map((bird, index) => (
                  <div key={index} className="bird-result-item">
                    <div className="bird-name">{bird.name}</div>
                    <div className="confidence">
                      {Math.round(bird.confidence * 100)}% confidence
                    </div>
                  </div>
                ))
              ) : (
                <p>No birds could be identified from this audio.</p>
              )}
            </div>

            {audioUrl && (
              <div className="audio-player">
                <h3>Your Audio Recording</h3>
                <audio src={audioUrl} controls />
              </div>
            )}

            <button className="upload-button" onClick={handleReset}>
              Handle New Audio
            </button>
          </div>
        )}
      </main>

      <footer></footer>
    </div>
  );
}

export default App;