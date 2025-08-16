import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';

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
        console.log('AuthenticatedImage: Loading image from:', src);
        console.log('AuthenticatedImage: Token available:', !!apiClient.token);
        
        // Use our API client to fetch with authentication
        const response = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${apiClient.token}`
          }
        });

        console.log('AuthenticatedImage: Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AuthenticatedImage: Error response:', errorText);
          throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setImageUrl(blobUrl);
        setLoading(false);
        console.log('AuthenticatedImage: Successfully loaded image');
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
        setLoading(false);
        if (onError) onError(err);
      }
    };

    loadImage();

    // Cleanup blob URL when component unmounts
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
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