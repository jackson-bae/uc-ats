# Club ATS

This is a fullstack web application built for our CS 35L final project. It serves as an Applicant Tracking System (ATS) for student clubs to manage their application and recruitment processes.

## Tech Stack

- **Frontend**: React (with Vite)
- **Backend**: Express.js
- **ORM**: Prisma
- **Database**: Supabase (PostgreSQL)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rahulnanda15/35L-ClubATS.git
cd club-ats
```

### 2. Install dependencies

Install frontend and backend dependencies:

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

### 3. Generate Prisma client

This step generates the Prisma client which allows you to query your database in a type-safe way. It reads your `schema.prisma` file and creates a client tailored to your data models in the `node_modules/@prisma/client` folder.

You need to run this every time the database schema changes (e.g., you add or modify a model in `schema.prisma`) to ensure the client reflects the current structure of the database.

```bash
cd server
npx prisma generate
```

## Testing  
### 1. Start the backend server

The backend is run locally on local port 3001.

```bash
cd server
npm run dev
```

### 2. Start the frontend

The frontend is run locally on local port 5173.

```bash
cd client
npm run dev
```

## User Flow
### 0. Google Form Applications

All of the applications in our applicant tracking system are fueled by responses from a Google Form: https://docs.google.com/forms/d/e/1FAIpQLSdpXneX-5RIdqclQGnk8DWOSHsQVcLxyCW2_EBMaI3eB8UdpA/viewform?pli=1. You can test this out after reading the below instructions by filling out the Google Form. Once you put in a new application, you will need to restart the backend once again for the applicant to be updated onto the website. 

```bash
cd server
npm run dev
```

### 1. Sign up

You should now log on to http://localhost:5173/...

As a new user, you are a part of the board of one of UCLA's renowned clubs and because it is the Fall, you have a new application cycle and a lot of new applicants to review in collaboration with your fellow board members. 

Because you are new to the platform, click on the Sign Up button and enter your new credentials. 

### 2. Application List

Upon landing to the application tracking system, you will see a list of applicants. You can use a series of dropdown menus to sort and filter out applicants as you need. You are also given the opportunity to grade applicants. Some of them already have grades, which should be visible, while others do not.

Clicking on any applicant, you will see a variety of information about them, including its existing applicant grades, photo, and basic information such as major, academic information, and demographic information. As a board member, you are to grade applications using the grading panel on the right, based on their resume, cover letter, and optional video. If an applicant did not submit any of these items, select N/A for that category. Once you are ready to submit your grades for an applicant, click Save Grades!

If you return back to the Application List page, you should see that your grade for that applicant should appear on its horizontal display card or should have influenced the average grades for that applicant. 

### 3. Candidate Management System

The following feature allows club administrators to manage recruitment candidates through various stages of the club application process.

Core Functionality:
  1. Candidate overview: View all of the candidates in an organized table
  2. Status Tracking: Monitor all candidates throughout each round of the recruitment process
  3. Approval System: Visual indicators on the table allow for approval, rejection, and pending of candidates throughout each round
  4. Bulk Advancement: Advance all candidates simultaneously
  5. Individual Actions: Advance, approve, reject, or waitlist applicants one at a time as well
  6. Data Management: Edit candidate information through the edit icon in each cell. Rounds are the only editable information for the candidates.
  7. Reset Functionality: The administrator can reset all decisions and start over

  #### User Workflow

  The Candidate Management feature supports the following candidate statuses:

  Rounds
    1. Submitted: Initial application has been received
    2. Under Review: Application is being evaluated, has made it past the submission stage
    3. Accepted: Candidate has been selected to join the club
    4. Rejected: Application has been declined
    5. Waitlisted: Candidate’s status has been placed on hold for now, and can either be Accepted or Rejected from there

### Notes

- The **Approval Status** cell is only for the **Bulk Advancement** feature.
- To use **Bulk Advancement**, candidates must be either **Approved** or **Rejected** via the **Approval Status** buttons (thumbs up / thumbs down).
- For **individual advancements**, use the **Advance** and **Reject** buttons in the **Actions** cell for that candidate.
- To **Waitlist** a candidate:
  - Click the **edit icon (pencil)** in the **Actions** cell.
  - Use the **Round dropdown** in the modal to select **Waitlisted**.
- **Waitlisted candidates cannot be rejected** through Bulk Advancement.
- If a **Waitlisted candidate** is approved through Bulk Advancement, their **Round Status** will remain **Waitlisted**.
- In the **Actions** cell, waitlisted candidates will have **Accept** and **Reject** buttons.
  - These are the only ways to remove a candidate from the Waitlist.
  - Click a button to update the candidate's status.
- Use the **filter dropdown** to filter the table by **Round** or **Approval Status**.
- The **Refresh** button reloads the page content without refreshing the entire browser.
- The **Reset All** button resets the **Round Status** for **all candidates** in case the administrator wants to start over.

