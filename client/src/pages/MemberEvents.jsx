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
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return {
      dayName,
      day: day.toString().padStart(2, '0'),
      monthYear: `${month}, ${year}`,
      time
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

  const handleAddToCalendar = (event) => {
    try {
      // Format dates for Google Calendar
      const startDate = new Date(event.eventStartDate);
      const endDate = event.eventEndDate ? new Date(event.eventEndDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours if no end date
      
      // Format dates to YYYYMMDDTHHMMSSZ format (UTC)
      const formatDateForGoogle = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const startTime = formatDateForGoogle(startDate);
      const endTime = formatDateForGoogle(endDate);

      // Create event details with time information
      const eventTitle = event.eventName;
      const timeString = startDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const dateString = startDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const eventDescription = `${event.description || 'Join us for this exciting UConsulting event!'}\n\nEvent Details:\nDate: ${dateString}\nTime: ${timeString}\nLocation: ${event.eventLocation || 'Location TBD'}`;
      const eventLocation = event.eventLocation || 'Location TBD';

      // Create Google Calendar URL
      const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
      googleCalendarUrl.searchParams.set('action', 'TEMPLATE');
      googleCalendarUrl.searchParams.set('text', eventTitle);
      googleCalendarUrl.searchParams.set('dates', `${startTime}/${endTime}`);
      googleCalendarUrl.searchParams.set('details', eventDescription);
      googleCalendarUrl.searchParams.set('location', eventLocation);
      googleCalendarUrl.searchParams.set('sf', 'true'); // Show form
      googleCalendarUrl.searchParams.set('output', 'xml'); // Open in new tab

      // Open Google Calendar in a new tab
      window.open(googleCalendarUrl.toString(), '_blank');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      alert('Failed to open calendar. Please try again.');
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
                <div className="event-time">{dateInfo.time}</div>
              </div>
              
              <div className="event-details">
                <h3 className="event-title">{event.eventName}</h3>
                <div className="event-location">
                  <MapPinIcon className="location-icon" />
                  <span>{event.eventLocation || 'Location TBD'}</span>
                </div>
                {event.description && (
                  <p className="event-description">
                    {event.description}
                  </p>
                )}
              </div>
              
              <div className="event-action">
                <div className="event-buttons">
                  <button 
                    className="rsvp-button"
                    onClick={() => handleRSVP(event)}
                    disabled={!event.memberRsvpUrl}
                  >
                    {event.memberRsvpUrl ? 'RSVP' : 'No RSVP Available'}
                  </button>
                  <button 
                    className="calendar-button"
                    onClick={() => handleAddToCalendar(event)}
                    title="Add to Google Calendar"
                  >
                    <svg className="google-calendar-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    Add to Calendar
                  </button>
                </div>
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






