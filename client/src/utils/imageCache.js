// Global image cache to store loaded images
const imageCache = new Map();
const loadingPromises = new Map();

// Cache for blob URLs to prevent memory leaks
const blobUrlCache = new Map();

class ImageCache {
  static async loadImage(src, token) {
    // Return cached image if available
    if (imageCache.has(src)) {
      return imageCache.get(src);
    }

    // Return existing loading promise if already loading
    if (loadingPromises.has(src)) {
      return loadingPromises.get(src);
    }

    // Create new loading promise
    const loadingPromise = this.fetchImage(src, token);
    loadingPromises.set(src, loadingPromise);

    try {
      const blobUrl = await loadingPromise;
      imageCache.set(src, blobUrl);
      return blobUrl;
    } finally {
      loadingPromises.delete(src);
    }
  }

  static async fetchImage(src, token) {
    try {
      console.log('ImageCache: Fetching image from:', src);
      console.log('ImageCache: Using token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(src, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('ImageCache: Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ImageCache: Error response:', errorText);
        throw new Error(`Failed to load image: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('ImageCache: Blob created:', blob.size, 'bytes');
      const blobUrl = URL.createObjectURL(blob);
      
      // Store blob URL for cleanup
      blobUrlCache.set(src, blobUrl);
      
      return blobUrl;
    } catch (error) {
      console.error('ImageCache: Error loading image:', error);
      throw error;
    }
  }

  static getCachedImage(src) {
    return imageCache.get(src);
  }

  static isImageCached(src) {
    return imageCache.has(src);
  }

  static isImageLoading(src) {
    return loadingPromises.has(src);
  }

  static clearCache() {
    // Revoke all blob URLs to prevent memory leaks
    blobUrlCache.forEach(blobUrl => {
      URL.revokeObjectURL(blobUrl);
    });
    
    imageCache.clear();
    loadingPromises.clear();
    blobUrlCache.clear();
  }

  static preloadImages(imageUrls, token) {
    // Preload multiple images in parallel
    const promises = imageUrls.map(src => this.loadImage(src, token));
    return Promise.allSettled(promises);
  }
}

export default ImageCache;
