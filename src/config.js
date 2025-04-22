const CONFIG = {
  // AWS API Gateway endpoint - replace with actual endpoint
  API_ENDPOINT: "https://example-api-gateway.amazonaws.com/prod/identifyBird",
  
  // Maximum file size for upload in bytes (default 10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  // Audio conversion settings - CAN DEFINITELY BE CHANGED
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