import {
  sendRSVPConfirmation,
  sendAttendanceConfirmation,
  sendAcceptanceEmail,
  sendRejectionEmail,
  sendCoffeeChatAcceptanceEmail,
  sendCoffeeChatRejectionEmail,
  sendFirstRoundAcceptanceEmail,
  sendFirstRoundRejectionEmail,
  sendFinalAcceptanceEmail,
  sendFinalRejectionEmail,
  sendMeetingSignupConfirmation,
  sendMeetingSignupNotification,
  sendMeetingCancellationEmail
} from './src/services/emailNotifications.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testEmails = async () => {
  // Get email from command line argument
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error('Please provide an email address as an argument');
    console.log('Usage: node test-email.js <email@example.com>');
    process.exit(1);
  }

  console.log(`Testing all email functions to: ${testEmail}\n`);
  console.log('='.repeat(60));

  // Test RSVP Confirmation
  console.log('\n1. Testing RSVP confirmation email...');
  await sendRSVPConfirmation(
    testEmail,
    'Test Candidate',
    'Fall Recruitment Info Session',
    new Date(),
    'Royce Hall'
  );

  // Test Attendance Confirmation
  console.log('\n2. Testing attendance confirmation email...');
  await sendAttendanceConfirmation(
    testEmail,
    'Test Candidate',
    'Fall Recruitment Info Session',
    new Date(),
    'Royce Hall'
  );

  // Test Resume Review Acceptance (advancing to Coffee Chats)
  console.log('\n3. Testing resume review acceptance email...');
  await sendAcceptanceEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test Resume Review Rejection
  console.log('\n4. Testing resume review rejection email...');
  await sendRejectionEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test Coffee Chat Acceptance (advancing to First Round)
  console.log('\n5. Testing coffee chat acceptance email...');
  await sendCoffeeChatAcceptanceEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test Coffee Chat Rejection
  console.log('\n6. Testing coffee chat rejection email...');
  await sendCoffeeChatRejectionEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test First Round Acceptance (advancing to Final Round)
  console.log('\n7. Testing first round acceptance email...');
  await sendFirstRoundAcceptanceEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test First Round Rejection
  console.log('\n8. Testing first round rejection email...');
  await sendFirstRoundRejectionEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test Final Round Acceptance
  console.log('\n9. Testing final round acceptance email...');
  await sendFinalAcceptanceEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test Final Round Rejection
  console.log('\n10. Testing final round rejection email...');
  await sendFinalRejectionEmail(
    testEmail,
    'Test Candidate',
    'Fall 2024 Recruitment'
  );

  // Test Meeting Signup Confirmation
  console.log('\n11. Testing meeting signup confirmation email...');
  await sendMeetingSignupConfirmation(
    testEmail,
    'Test Candidate',
    'Test Member',
    'Powell Library',
    new Date(),
    new Date(Date.now() + 3600000) // 1 hour from now
  );

  // Test Meeting Signup Notification (to member)
  console.log('\n12. Testing meeting signup notification email...');
  await sendMeetingSignupNotification(
    testEmail,
    'Test Member',
    'Test Candidate',
    'candidate@example.com',
    '123456789',
    'Powell Library',
    new Date(),
    new Date(Date.now() + 3600000) // 1 hour from now
  );

  // Test Meeting Cancellation
  console.log('\n13. Testing meeting cancellation email...');
  await sendMeetingCancellationEmail(
    testEmail,
    'Test Candidate',
    'Test Member',
    'Powell Library',
    new Date(),
    new Date(Date.now() + 3600000) // 1 hour from now
  );

  console.log('\n' + '='.repeat(60));
  console.log('\nAll email tests completed! Check your inbox at:', testEmail);
  console.log('Note: Some emails may be in spam/promotions folders');
};

testEmails().catch(console.error);
