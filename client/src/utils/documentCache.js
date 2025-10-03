// Document cache utility for managing blob URLs
class DocumentCache {
  constructor(maxSize = 20) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(src) {
    return this.cache.get(src);
  }

  set(src, blobUrl) {
    // Clean up if cache is getting too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }
    
    this.cache.set(src, blobUrl);
  }

  has(src) {
    return this.cache.has(src);
  }

  cleanup() {
    if (this.cache.size === 0) return;
    
    // Remove oldest entries (Map maintains insertion order)
    const entries = Array.from(this.cache.entries());
    const toRemove = entries.slice(0, Math.floor(this.maxSize / 2));
    
    toRemove.forEach(([src, url]) => {
      URL.revokeObjectURL(url);
      this.cache.delete(src);
    });
  }

  clear() {
    // Revoke all blob URLs to prevent memory leaks
    this.cache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Export a singleton instance
export const documentCache = new DocumentCache();
export default DocumentCache;
