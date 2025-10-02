import React from 'react';
import AccessControl from '../components/AccessControl';

export default function RecruitmentResources() {
  return (
    <AccessControl allowedRoles={['ADMIN', 'MEMBER']}>
      <div style={{ padding: '2rem' }}>
      <h1>Recruitment Resources and Timeline</h1>
      <p>This page will contain the recruitment resources and timeline interface for UC members.</p>
      <p>Features will include:</p>
      <ul>
        <li>Detailed recruitment timeline</li>
        <li>Resource library</li>
        <li>Important dates and deadlines</li>
        <li>Training materials</li>
      </ul>
    </div>
    </AccessControl>
  );
}
