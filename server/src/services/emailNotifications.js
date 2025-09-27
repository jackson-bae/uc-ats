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
          <h2 style="color: #333; margin: 0;">UConsulting ATS</h2>
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
          <h2 style="color: #333; margin: 0;">UConsulting ATS</h2>
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
  // Convert UTC time to PST for display (subtract 8 hours)
  const utcDate = new Date(date);
  const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
  
  return pstDate.toLocaleDateString('en-US', {
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

// Coffee Chat specific email templates

// Create coffee chat acceptance email template (advancing to first round)
const createCoffeeChatAcceptanceEmail = (candidateName, currentCycleName) => {
  return {
    subject: `Congratulations! You've Advanced to First Round Interviews - ${currentCycleName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; padding: 20px; text-align: center; color: white;">
          <h2 style="color: white; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">🎉 Congratulations! You've Advanced to First Round Interviews!</h3>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We're thrilled to inform you that you have successfully advanced to the <strong>First Round Interviews</strong> of our recruitment process for the <strong>${currentCycleName}</strong> cycle!
          </p>
          
          <div style="background-color: #cce7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4 style="color: #004085; margin: 0 0 10px 0;">What This Means</h4>
            <p style="color: #004085; margin: 5px 0;">✅ You've successfully passed the Coffee Chat round</p>
            <p style="color: #004085; margin: 5px 0;">🎯 You'll be invited to participate in First Round Interviews</p>
            <p style="color: #004085; margin: 5px 0;">📅 You'll receive detailed scheduling information soon</p>
            <p style="color: #004085; margin: 5px 0;">📋 Prepare for behavioral and market sizing questions</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This is a significant achievement! Your performance during the Coffee Chat round impressed our team, and we're excited to learn more about your qualifications during the First Round Interviews.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            The First Round Interviews will include both behavioral questions and a market sizing case. We'll send you detailed preparation materials and scheduling information in the coming days.
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

// Create coffee chat rejection email template
const createCoffeeChatRejectionEmail = (candidateName, currentCycleName) => {
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
            Thank you for your interest in UC Consulting and for participating in our <strong>${currentCycleName}</strong> recruitment cycle.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            After careful consideration following the Coffee Chat round, we regret to inform you that we are unable to move forward with your candidacy at this time.
          </p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">Important Information</h4>
            <p style="color: #721c24; margin: 5px 0;">📝 Your application and Coffee Chat performance were reviewed thoroughly</p>
            <p style="color: #721c24; margin: 5px 0;">💼 We encourage you to apply to future recruitment cycles</p>
            <p style="color: #721c24; margin: 5px 0;">🌟 Continue developing your skills and experience</p>
            <p style="color: #721c24; margin: 5px 0;">🤝 We appreciate your time and engagement in our process</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We appreciate the time and effort you put into your application and participation in the Coffee Chat round. We received many strong applications this cycle, and the decision was not easy.
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

// First Round specific email templates

// Create first round acceptance email template (advancing to final round)
const createFirstRoundAcceptanceEmail = (candidateName, currentCycleName) => {
  return {
    subject: `Congratulations! You've Advanced to Final Round - ${currentCycleName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; padding: 20px; text-align: center; color: white;">
          <h2 style="color: white; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">🎉 Congratulations! You've Advanced to Final Round!</h3>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            We are excited to inform you that you have successfully advanced to the Final Round of our recruitment process for ${currentCycleName}!
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Your performance in the First Round interviews was impressive, and we look forward to learning more about you in the final stage of our selection process.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            <strong>Next Steps:</strong><br>
            • You will receive further instructions about the Final Round process<br>
            • Please keep an eye on your email for scheduling details<br>
            • Continue to prepare for the final stage of interviews
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Congratulations on making it this far! We're excited to see what you bring to the Final Round.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            The UC Consulting Recruitment Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Create first round rejection email template
const createFirstRoundRejectionEmail = (candidateName, currentCycleName) => {
  return {
    subject: `Update on Your Application - ${currentCycleName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center; color: white;">
          <h2 style="color: white; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">Application Update</h3>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in joining UC Consulting and for participating in our recruitment process for ${currentCycleName}.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            After careful consideration of your First Round interview performance, we have decided not to advance your application to the Final Round at this time.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            This decision was not made lightly, and we appreciate the time and effort you invested in our process. We encourage you to apply again in future recruitment cycles.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            We wish you the best of luck in your future endeavors.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            The UC Consulting Recruitment Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Send coffee chat acceptance email (advancing to first round)
export const sendCoffeeChatAcceptanceEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createCoffeeChatAcceptanceEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Coffee chat acceptance email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send coffee chat acceptance email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendCoffeeChatAcceptanceEmail:', error);
    return { success: false, error: error.message };
  }
};

// Send coffee chat rejection email
export const sendCoffeeChatRejectionEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createCoffeeChatRejectionEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Coffee chat rejection email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send coffee chat rejection email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendCoffeeChatRejectionEmail:', error);
    return { success: false, error: error.message };
  }
};

// Final Round specific email templates

// Create final round acceptance email template
const createFinalAcceptanceEmail = (candidateName, currentCycleName) => {
  return {
    subject: `🎉 Congratulations! You've Been Accepted to UC Consulting - ${currentCycleName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; text-align: center; color: white;">
          <h2 style="color: white; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">🎉 Congratulations! You've Been Accepted!</h3>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We are thrilled to inform you that you have been <strong>ACCEPTED</strong> to join UC Consulting for the <strong>${currentCycleName}</strong> recruitment cycle!
          </p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">What This Means</h4>
            <p style="color: #155724; margin: 5px 0;">🎯 You've successfully completed our entire recruitment process</p>
            <p style="color: #155724; margin: 5px 0;">✅ You've been selected to join UC Consulting</p>
            <p style="color: #155724; margin: 5px 0;">🌟 You'll receive onboarding information soon</p>
            <p style="color: #155724; margin: 5px 0;">🤝 Welcome to the UC Consulting team!</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This is an incredible achievement! You've demonstrated exceptional qualifications throughout our rigorous recruitment process, and we're excited to have you join our team.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You will receive detailed onboarding information, including next steps, orientation details, and important dates in the coming days. Please keep an eye on your email for these communications.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Congratulations once again, and welcome to UC Consulting!
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

// Create final round rejection email template
const createFinalRejectionEmail = (candidateName, currentCycleName) => {
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
            Thank you for your continued interest in UC Consulting and for your participation throughout our <strong>${currentCycleName}</strong> recruitment process.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            After careful consideration following the Final Round, we regret to inform you that we are unable to offer you a position at this time.
          </p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">Important Information</h4>
            <p style="color: #721c24; margin: 5px 0;">📝 Your application was thoroughly reviewed at every stage</p>
            <p style="color: #721c24; margin: 5px 0;">💼 We encourage you to apply to future recruitment cycles</p>
            <p style="color: #721c24; margin: 5px 0;">🌟 Continue developing your skills and experience</p>
            <p style="color: #721c24; margin: 5px 0;">🤝 We appreciate your dedication throughout our process</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We were impressed by your qualifications and dedication throughout our recruitment process. The decision was extremely difficult, as we received many exceptional applications this cycle.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We encourage you to continue developing your skills and to consider applying to future recruitment cycles. Your growth and potential are evident, and we believe you have a bright future ahead.
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

// Send first round acceptance email (advancing to final round)
export const sendFirstRoundAcceptanceEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createFirstRoundAcceptanceEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`First round acceptance email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send first round acceptance email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendFirstRoundAcceptanceEmail:', error);
    return { success: false, error: error.message };
  }
};

// Send first round rejection email
export const sendFirstRoundRejectionEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createFirstRoundRejectionEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`First round rejection email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send first round rejection email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendFirstRoundRejectionEmail:', error);
    return { success: false, error: error.message };
  }
};

// Send final round acceptance email
export const sendFinalAcceptanceEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createFinalAcceptanceEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Final acceptance email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send final acceptance email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendFinalAcceptanceEmail:', error);
    return { success: false, error: error.message };
  }
};

// Send final round rejection email
export const sendFinalRejectionEmail = async (candidateEmail, candidateName, currentCycleName) => {
  try {
    const emailContent = createFinalRejectionEmail(candidateName, currentCycleName);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Final rejection email sent to ${candidateEmail} for cycle: ${currentCycleName}`);
    } else {
      console.error(`Failed to send final rejection email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendFinalRejectionEmail:', error);
    return { success: false, error: error.message };
  }
};

// Meeting Signup specific email templates

// Create meeting signup confirmation email template
const createMeetingSignupConfirmationEmail = (candidateName, memberName, location, startTime, endTime) => {
  const formatDateTime = (date) => {
    // Convert UTC time to PST for display (subtract 8 hours)
    const utcDate = new Date(date);
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    
    return pstDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (date) => {
    // Convert UTC time to PST for display (subtract 8 hours)
    const utcDate = new Date(date);
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    
    return pstDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
    subject: `Time Slot Confirmation - Get to Know UC`,
    html: `
     
  
        <div style="padding: 30px 20px;">
        
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for signing up to meet with a UConsulting member! We're excited to get to know you better.
          </p>
          
          <div style="background-color: #cce7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4 style="color: #004085; margin: 0 0 15px 0;">Meeting Details</h4>
            <p style="color: #004085; margin: 8px 0;"><strong>Member:</strong> ${memberName}</p>
            <p style="color: #004085; margin: 8px 0;"><strong>Date & Time:</strong> ${formatDateTime(startTime)}</p>
            <p style="color: #004085; margin: 8px 0;"><strong>Duration:</strong> ${formatTime(startTime)} - ${formatTime(endTime)}</p>
            <p style="color: #004085; margin: 8px 0;"><strong>Location:</strong> ${location}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #333; margin: 0 0 15px 0;">What to Expect</h4>
            <p style="color: #666; margin: 8px 0;">• This is a casual chat to learn more about UC</p>
            <p style="color: #666; margin: 8px 0;">• Feel free to ask questions about our organization, projects, and culture</p>
            <p style="color: #666; margin: 8px 0;">• This is a great opportunity to connect with current members</p>
            <p style="color: #666; margin: 8px 0;">• No preparation required - just come ready to chat!</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            If you need to cancel or reschedule, please contact us at <strong>uconsultingla@gmail.com</strong> as soon as possible.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We look forward to meeting you!
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Best,<br>
             UConsulting Recruitment Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Send meeting signup confirmation email
export const sendMeetingSignupConfirmation = async (candidateEmail, candidateName, memberName, location, startTime, endTime) => {
  try {
    const emailContent = createMeetingSignupConfirmationEmail(candidateName, memberName, location, startTime, endTime);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Meeting signup confirmation email sent to ${candidateEmail} for meeting with ${memberName}`);
    } else {
      console.error(`Failed to send meeting signup confirmation email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendMeetingSignupConfirmation:', error);
    return { success: false, error: error.message };
  }
};

// Create meeting signup notification email template for members
const createMeetingSignupNotificationEmail = (memberName, candidateName, candidateEmail, studentId, location, startTime, endTime) => {
  const formatDateTime = (date) => {
    // Convert UTC time to PST for display (subtract 8 hours)
    const utcDate = new Date(date);
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    
    return pstDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (date) => {
    // Convert UTC time to PST for display (subtract 8 hours)
    const utcDate = new Date(date);
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    
    return pstDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
    subject: `New GTKUC Signup - ${candidateName} signed up for your slot`,
    html: `
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Hi ${memberName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Great news! Someone has signed up for one of your GTKUC slots. Here are the details:
          </p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h4 style="color: #155724; margin: 0 0 15px 0;">Meeting Details</h4>
            <p style="color: #155724; margin: 8px 0;"><strong>Date & Time:</strong> ${formatDateTime(startTime)}</p>
            <p style="color: #155724; margin: 8px 0;"><strong>Duration:</strong> ${formatTime(startTime)} - ${formatTime(endTime)}</p>
            <p style="color: #155724; margin: 8px 0;"><strong>Location:</strong> ${location}</p>
          </div>
          
          <div style="background-color: #cce7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4 style="color: #004085; margin: 0 0 15px 0;">Candidate Information</h4>
            <p style="color: #004085; margin: 8px 0;"><strong>Name:</strong> ${candidateName}</p>
            <p style="color: #004085; margin: 8px 0;"><strong>Email:</strong> ${candidateEmail}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #333; margin: 0 0 15px 0;">Next Steps</h4>
            <p style="color: #666; margin: 8px 0;">• Mark attendance after the meeting in the ATS system</p>
            <p style="color: #666; margin: 8px 0;">• Contact the candidate if you need to reschedule</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You can view and manage all your meeting slots in the <a href="https://uconsultingats.com/member/meeting-slots" style="color: #007bff;">Member Dashboard</a>.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            UConsulting Recruitment Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Send meeting signup notification email to member
export const sendMeetingSignupNotification = async (memberEmail, memberName, candidateName, candidateEmail, studentId, location, startTime, endTime) => {
  try {
    const emailContent = createMeetingSignupNotificationEmail(memberName, candidateName, candidateEmail, studentId, location, startTime, endTime);
    const result = await sendEmail(memberEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Meeting signup notification email sent to ${memberEmail} for signup by ${candidateName}`);
    } else {
      console.error(`Failed to send meeting signup notification email to ${memberEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendMeetingSignupNotification:', error);
    return { success: false, error: error.message };
  }
};

// Create meeting cancellation email template
const createMeetingCancellationEmail = (candidateName, memberName, location, startTime, endTime) => {
  const formatDateTime = (date) => {
    // Convert UTC time to PST for display (subtract 8 hours)
    const utcDate = new Date(date);
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    
    return pstDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (date) => {
    // Convert UTC time to PST for display (subtract 8 hours)
    const utcDate = new Date(date);
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    
    return pstDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
    subject: `Meeting Cancelled - Get to Know UC`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center; color: white;">
          <h2 style="color: white; margin: 0;">UC Consulting ATS</h2>
        </div>
        
        <div style="padding: 30px 20px;">
          <h3 style="color: #333; margin-bottom: 20px;">❌ Meeting Cancelled</h3>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Dear ${candidateName},
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We regret to inform you that your scheduled meeting with UC Consulting has been cancelled.
          </p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h4 style="color: #721c24; margin: 0 0 15px 0;">Cancelled Meeting Details</h4>
            <p style="color: #721c24; margin: 8px 0;"><strong>Member:</strong> ${memberName}</p>
            <p style="color: #721c24; margin: 8px 0;"><strong>Date & Time:</strong> ${formatDateTime(startTime)}</p>
            <p style="color: #721c24; margin: 8px 0;"><strong>Duration:</strong> ${formatTime(startTime)} - ${formatTime(endTime)}</p>
            <p style="color: #721c24; margin: 8px 0;"><strong>Location:</strong> ${location}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #333; margin: 0 0 15px 0;">What's Next?</h4>
            <p style="color: #666; margin: 8px 0;">• You can sign up for other available meeting slots</p>
            <p style="color: #666; margin: 8px 0;">• Visit our <a href="https://uconsultingats.com/meet" style="color: #007bff;">meeting signup page</a> to see available slots</p>
            <p style="color: #666; margin: 8px 0;">• If you have any questions, please contact us at <strong>uconsultingla@gmail.com</strong></p>
            <p style="color: #666; margin: 8px 0;">• We apologize for any inconvenience this may cause</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We appreciate your interest in UC Consulting and hope you'll consider signing up for another meeting slot.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Best regards,<br>
            UC Consulting Team
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };
};

// Send meeting cancellation email
export const sendMeetingCancellationEmail = async (candidateEmail, candidateName, memberName, location, startTime, endTime) => {
  try {
    const emailContent = createMeetingCancellationEmail(candidateName, memberName, location, startTime, endTime);
    const result = await sendEmail(candidateEmail, emailContent.subject, emailContent.html);
    
    if (result.success) {
      console.log(`Meeting cancellation email sent to ${candidateEmail} for cancelled meeting with ${memberName}`);
    } else {
      console.error(`Failed to send meeting cancellation email to ${candidateEmail}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendMeetingCancellationEmail:', error);
    return { success: false, error: error.message };
  }
};
