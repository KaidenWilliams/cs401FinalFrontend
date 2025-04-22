const CONFIG = {
  // AWS API Gateway endpoint
  API_ENDPOINT: "https://rbqjqctmce.execute-api.us-east-1.amazonaws.com/newstage/identifybird",
  
  // Maximum file size for upload in bytes (default 10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  // Audio conversion settings
  AUDIO: {
    // Target format for conversion
    TARGET_FORMAT: "ogg",
    
    // Audio quality (0-1) for Ogg Vorbis conversion
    QUALITY: 0.7,
    
    // Sample rate for audio conversion
    SAMPLE_RATE: 44100
  }
};

export default CONFIG;