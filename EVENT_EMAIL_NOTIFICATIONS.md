# Event Email Notifications

This document describes the automated email notification system for event RSVPs and attendance confirmations in the UC ATS system.

## Overview

The system now automatically sends email notifications to candidates when:
1. **RSVP Confirmation**: A candidate submits an RSVP for an event
2. **Attendance Confirmation**: A candidate's attendance is recorded for an event

## How It Works

### 1. Automated Email Sending
When the system syncs Google Form responses for events (RSVP or attendance), it automatically:
- Processes the form response
- Creates the database record
- Sends a confirmation email to the candidate

### 2. Email Templates
The system uses professional HTML email templates that include:
- UC Consulting ATS branding
- Event details (name, date, location)
- Personalized greeting with candidate name
- Clear confirmation message
- Contact information

### 3. Email Configuration
The system uses Gmail SMTP for sending emails. Configuration is handled through environment variables:
```env
EMAIL_USER='your-email@gmail.com'
EMAIL_PASS='your-app-specific-password'
```

## Email Templates

### RSVP Confirmation Email
- **Subject**: "RSVP Confirmation - [Event Name]"
- **Content**: Confirms receipt of RSVP with event details
- **Sent when**: Candidate submits RSVP form

### Attendance Confirmation Email
- **Subject**: "Attendance Confirmation - [Event Name]"
- **Content**: Confirms attendance recording with event details
- **Sent when**: Candidate's attendance is recorded

## Implementation Details

### Files Modified/Created

1. **`server/src/services/emailNotifications.js`** (NEW)
   - Email service with templates and sending logic
   - Functions for RSVP and attendance confirmations
   - Date formatting utilities

2. **`server/src/services/syncEventResponses.js`** (MODIFIED)
   - Added email notification calls after successful database operations
   - Integrated with existing sync functions

3. **`server/src/routes/admin.js`** (MODIFIED)
   - Added test endpoint for email notifications
   - Allows manual testing of email functionality

4. **`client/src/pages/EventManagement.jsx`** (MODIFIED)
   - Added "Test Email" button for each event
   - Added dialog for testing email notifications
   - Allows admins to test email functionality

### Database Integration
- Uses existing `Candidate` and `Events` models
- No additional database changes required
- Emails are sent based on candidate email and event information

## Testing the Email System

### 1. Manual Testing via Admin Interface
1. Go to Event Management page
2. Click "Test Email" button for any event
3. Enter a candidate email address
4. Select notification type (RSVP or Attendance)
5. Click "Send Test Email"

### 2. Automated Testing via Sync
1. Set up Google Forms for RSVP/Attendance
2. Have candidates submit forms
3. Run sync operations (manual or scheduled)
4. Check email delivery

### 3. API Testing
```bash
# Test RSVP email
curl -X POST http://localhost:3001/api/admin/test-email-notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventId": "event-uuid",
    "type": "rsvp",
    "candidateEmail": "candidate@example.com"
  }'

# Test Attendance email
curl -X POST http://localhost:3001/api/admin/test-email-notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventId": "event-uuid",
    "type": "attendance",
    "candidateEmail": "candidate@example.com"
  }'
```

## Error Handling

### Email Failures
- Email sending errors are logged but don't fail the sync process
- Database operations succeed even if email fails
- Failed emails are logged with detailed error information

### Missing Data
- System checks for required candidate and event information
- Graceful handling of missing email addresses
- Validation of event and candidate existence

## Configuration

### Environment Variables
```env
# Required for email functionality
EMAIL_USER='your-gmail-address@gmail.com'
EMAIL_PASS='your-app-specific-password'
```

### Gmail Setup
1. Enable 2-factor authentication on Gmail account
2. Generate an App Password
3. Use the App Password in EMAIL_PASS environment variable

### Email Limits
- Gmail has daily sending limits (typically 500 emails/day for regular accounts)
- Consider using a dedicated email service for production

## Monitoring and Logging

### Console Logs
The system logs email activities:
```
RSVP confirmation email sent to candidate@example.com for event: Info Session
Attendance confirmation email sent to candidate@example.com for event: Info Session
```

### Error Logs
Failed email attempts are logged with details:
```
Error sending RSVP confirmation email: SMTP connection failed
```

## Future Enhancements

### Potential Improvements
1. **Email Queue System**: Implement queuing for high-volume scenarios
2. **Email Templates**: Add more customization options
3. **Email Preferences**: Allow candidates to opt-out of notifications
4. **Email Analytics**: Track open rates and engagement
5. **SMS Notifications**: Add SMS confirmation options

### Additional Email Types
1. **Event Reminders**: Send reminders before events
2. **Interview Confirmations**: Confirm interview scheduling
3. **Application Status Updates**: Notify of application progress
4. **Welcome Emails**: Send to new candidates

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check EMAIL_USER and EMAIL_PASS environment variables
   - Verify Gmail App Password is correct
   - Check Gmail account settings and limits

2. **Candidate not found**
   - Ensure candidate email exists in database
   - Check candidate record has valid email address

3. **Event not found**
   - Verify event ID is correct
   - Check event exists and is active

4. **Email formatting issues**
   - Check HTML template syntax
   - Verify special characters are properly escaped

### Debug Steps
1. Check server logs for email-related errors
2. Test email functionality using admin interface
3. Verify environment variables are set correctly
4. Test with a known valid candidate email



