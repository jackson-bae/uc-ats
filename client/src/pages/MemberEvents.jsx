import React, { useEffect, useState } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/api';
import '../styles/CandidateEvents.css';

export default function MemberEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Use member events endpoint
      const data = await apiClient.get('/member/events');
      setEvents(data);
    } catch (e) {
      setError('Failed to load events');
      console.error('Error fetching events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    
    return {
      dayName,
      day: day.toString().padStart(2, '0'),
      monthYear: `${month}, ${year}`
    };
  };

  const handleRSVP = async (event) => {
    try {
      if (event.memberRsvpUrl) {
        // Open the member RSVP form in a new tab
        window.open(event.memberRsvpUrl, '_blank');
      } else {
        alert('Member RSVP form not available for this event.');
      }
    } catch (error) {
      console.error('Error handling RSVP:', error);
    }
  };

  if (loading) {
    return (
      <div className="candidate-events-container">
        <div className="loading">Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-events-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="candidate-events-container">
      <div className="events-header">
        <div className="events-title-section">
          <h1 className="events-title">Events</h1>
          <p className="events-subtitle">
            Join us to learn more about UConsulting and network with candidates
          </p>
        </div>
        <div className="social-media-prompt">
          <span>Follow us on:</span>
        </div>
      </div>

      <div className="events-list">
        {events.map((event) => {
          const dateInfo = formatDate(event.eventStartDate);
          
          return (
            <div key={event.id} className="event-card">
              <div className="event-date">
                <div className="day-name">{dateInfo.dayName}</div>
                <div className="day-number">{dateInfo.day}</div>
                <div className="month-year">{dateInfo.monthYear}</div>
              </div>
              
              <div className="event-details">
                <h3 className="event-title">{event.eventName}</h3>
                <div className="event-location">
                  <MapPinIcon className="location-icon" />
                  <span>{event.eventLocation || 'Location TBD'}</span>
                </div>
                <p className="event-description">
                  {event.description || 'Join us for this exciting event!'}
                </p>
              </div>
              
              <div className="event-action">
                <button 
                  className="rsvp-button"
                  onClick={() => handleRSVP(event)}
                  disabled={!event.memberRsvpUrl}
                >
                  {event.memberRsvpUrl ? 'RSVP' : 'No RSVP Available'}
                </button>
              </div>
            </div>
          );
        })}
        
        {events.length === 0 && (
          <div className="no-events">
            <p>No events scheduled at this time. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}


