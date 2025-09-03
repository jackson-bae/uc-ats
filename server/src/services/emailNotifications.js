import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const createRSVPConfirmationEmail = (candidateName, eventName, eventDate, eventLocation) => {
  return {
    subject: `RSVP Confirmation - ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h2 style="color: #333; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">RSVP Confirmation</h3>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your RSVP! We have successfully received your response for the following event:
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #333; margin: 0 0 10px 0;">Event Details</h4>
            <p style="color: #666; margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
            ${eventLocation ? `<p style="color: #666; margin: 5px 0;"><strong>Location:</strong> ${eventLocation}</p>` : ''}
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We look forward to seeing you at the event! If you have any questions or need to make changes to your RSVP, please don't hesitate to contact us.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            UC Consulting ATS Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

const createAttendanceConfirmationEmail = (candidateName, eventName, eventDate, eventLocation) => {
  return {
    subject: `Attendance Confirmation - ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h2 style="color: #333; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">Attendance Confirmation</h3>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for attending our event! We have successfully recorded your attendance for the following event:
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #333; margin: 0 0 10px 0;">Event Details</h4>
            <p style="color: #666; margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
            ${eventLocation ? `<p style="color: #666; margin: 5px 0;"><strong>Location:</strong> ${eventLocation}</p>` : ''}
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We appreciate your participation and hope you found the event valuable. If you have any feedback or questions, please feel free to reach out to us.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            UC Consulting ATS Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"UC Consulting ATS" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send RSVP confirmation email
export const sendRSVPConfirmation = async (candidateEmail, candidateName, eventName, eventDate, eventLocation) => {
  try {
    const emailContent = createRSVPConfirmationEmail(candidateName, eventName, eventDate, eventLocation);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`RSVP confirmation email sent to ${candidateEmail} for event: ${eventName}`);
    } else {
      console.error(`Failed to send RSVP confirmation email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendRSVPConfirmation:', error);
    return { success: false, error: error.message };
  }
};

// Send attendance confirmation email
export const sendAttendanceConfirmation = async (candidateEmail, candidateName, eventName, eventDate, eventLocation) => {
  try {
    const emailContent = createAttendanceConfirmationEmail(candidateName, eventName, eventDate, eventLocation);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Attendance confirmation email sent to ${candidateEmail} for event: ${eventName}`);
    } else {
      console.error(`Failed to send attendance confirmation email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendAttendanceConfirmation:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to format event date
export const formatEventDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Create acceptance email template
const createAcceptanceEmail = (candidateName, currentCycleName) => {
  return {
    subject: `Congratulations! You've Advanced to Coffee Chats - ${currentCycleName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; text-align: center; color: white;">
          <h2 style="color: white; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">🎉 Congratulations! You've Advanced!</h3>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We're excited to inform you that you have successfully advanced to the <strong>Coffee Chats</strong> round of our recruitment process for the <strong>${currentCycleName}</strong> cycle!
          </p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">What This Means</h4>
            <p style="color: #155724; margin: 5px 0;">✅ You've successfully passed the Resume Review round</p>
            <p style="color: #155724; margin: 5px 0;">☕ You'll be invited to participate in Coffee Chats</p>
            <p style="color: #155724; margin: 5px 0;">📅 You'll receive scheduling information soon</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This is a significant achievement and demonstrates the quality of your application. We look forward to getting to know you better during the Coffee Chats round.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You will receive additional information about scheduling and preparation for the Coffee Chats round in the coming days.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            UC Consulting Recruitment Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Create rejection email template
const createRejectionEmail = (candidateName, currentCycleName) => {
  return {
    subject: `Update on Your Application - ${currentCycleName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center; color: white;">
          <h2 style="color: white; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">Application Update</h3>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in UC Consulting and for taking the time to apply to our <strong>${currentCycleName}</strong> recruitment cycle.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            After careful review of your application, we regret to inform you that we are unable to move forward with your candidacy at this time.
          </p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">Important Information</h4>
            <p style="color: #721c24; margin: 5px 0;">📝 Your application has been reviewed thoroughly</p>
            <p style="color: #721c24; margin: 5px 0;">💼 We encourage you to apply to future cycles</p>
            <p style="color: #721c24; margin: 5px 0;">🌟 Continue developing your skills and experience</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We appreciate the time and effort you put into your application. We received many strong applications this cycle, and the decision was not easy.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We encourage you to continue developing your skills and to consider applying to future recruitment cycles. Your growth and development are important to us.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            UC Consulting Recruitment Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Send acceptance email
export const sendAcceptanceEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createAcceptanceEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Acceptance email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send acceptance email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendAcceptanceEmail:', error);
    return { success: false, error: error.message };
  }
};

// Send rejection email
export const sendRejectionEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createRejectionEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Rejection email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send rejection email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendRejectionEmail:', error);
    return { success: false, error: error.message };
  }
};
