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
        // Check if image is already cached
        const cachedImage = ImageCache.getCachedImage(src);
        if (cachedImage) {
          setImageUrl(cachedImage);
          setLoading(false);
          return;
        }

        // Load image using cache
        const blobUrl = await ImageCache.loadImage(src, apiClient.token);
        setImageUrl(blobUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error loading image:', err);
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