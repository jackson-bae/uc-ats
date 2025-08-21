# Member Signup Feature

## Overview
A special signup page has been created for registering new members with automatic MEMBER role assignment. This page is not publicly accessible and requires a special access token.

## Access URL
The member signup page can be accessed at:
```
/member-signup?token=member-access-2024
```

## Features
- **Automatic Role Assignment**: Users registered through this form are automatically assigned the MEMBER role
- **Protected Access**: The page requires a specific token parameter to access
- **Same Validation**: Uses the same validation rules as the regular signup form
- **Server-side Protection**: The registration endpoint also validates the access token

## Security
- The access token is hardcoded as `member-access-2024`
- Both client-side and server-side validation ensure only authorized access
- Invalid access attempts redirect to the login page
- The token should be kept secret and shared only with authorized personnel

## Usage
1. Share the URL with the required token parameter with authorized members
2. Members can register using the same form fields as regular signup
3. Upon successful registration, they are automatically logged in as MEMBER role
4. They are redirected to the application list page

## Technical Details
- **Client Route**: `/member-signup`
- **Server Endpoint**: `POST /auth/register-member`
- **Required Token**: `member-access-2024`
- **User Role**: Automatically set to `MEMBER`

## Files Modified
- `client/src/pages/MemberSignUp.jsx` - New member signup page
- `client/src/context/AuthContext.jsx` - Added registerMember function
- `client/src/App.jsx` - Added new route
- `server/src/routes/auth.js` - Added member registration endpoint
