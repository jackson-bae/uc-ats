import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import ImageCache from '../utils/imageCache';

const AuthenticatedImage = ({ src, alt, style, onError, ...props }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    const loadImage = async () => {
      try {
        console.log('AuthenticatedImage: Loading image:', src);
        console.log('AuthenticatedImage: Token available:', !!apiClient.token);
        
        // Check if image is already cached
        const cachedImage = ImageCache.getCachedImage(src);
        if (cachedImage) {
          console.log('AuthenticatedImage: Using cached image');
          setImageUrl(cachedImage);
          setLoading(false);
          return;
        }

        // Load image using cache
        console.log('AuthenticatedImage: Fetching new image');
        const blobUrl = await ImageCache.loadImage(src, apiClient.token);
        console.log('AuthenticatedImage: Image loaded successfully');
        setImageUrl(blobUrl);
        setLoading(false);
      } catch (err) {
        console.error('AuthenticatedImage: Error loading image:', err);
        setError(true);
        setLoading(false);
        if (onError) onError(err);
      }
    };

    loadImage();
  }, [src]);

  if (loading) {
    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#666'
        }}
        {...props}
      >
        Loading...
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#666',
          border: '2px dashed #ccc'
        }}
        {...props}
      >
        Photo unavailable
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={alt} 
      style={style}
      {...props}
    />
  );
};

export default AuthenticatedImage; 