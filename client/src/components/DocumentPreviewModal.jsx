import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  width: '90vw',
  height: '90vh',
  backgroundColor: '#fff',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const contentStyle = {
  flex: 1,
  backgroundColor: '#f9fafb',
};

export default function DocumentPreviewModal({ src, kind, title, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let localUrl;
    const load = async () => {
      try {
        const resp = await fetch(src, {
          headers: {
            Authorization: `Bearer ${apiClient.token}`,
          },
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`${resp.status} ${resp.statusText} - ${txt}`);
        }
        const blob = await resp.blob();
        localUrl = URL.createObjectURL(blob);
        setBlobUrl(localUrl);
      } catch (e) {
        setError(e.message || 'Failed to load document');
      }
    };
    load();
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [src]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ fontWeight: 600 }}>{title || 'Preview'}</div>
          <button onClick={onClose} style={{ padding: '6px 10px' }}>Close</button>
        </div>
        <div style={contentStyle}>
          {error && (
            <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>
          )}
          {!error && !blobUrl && (
            <div style={{ padding: 16 }}>Loading preview…</div>
          )}
          {!error && blobUrl && (
            kind === 'pdf' ? (
              <iframe
                title={title || 'Document preview'}
                src={blobUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : kind === 'video' ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                <video src={blobUrl} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                <img src={blobUrl} alt={title || 'Image preview'} style={{ maxWidth: '100%', maxHeight: '100%' }} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}


