# Production Setup for File Serving

This document explains how to configure your application for production file serving so that users on different machines can access documents.

## Problem
The application was storing file URLs with `localhost:3001` which only works on the local development machine. Users accessing from other machines or the production site couldn't view documents.

## Solution
The application now uses environment-based base URLs that automatically adapt to the deployment environment.

## Configuration

### Environment Variables

Add these environment variables to your production environment:

```bash
# For production
BASE_URL=https://uconsultingats.com
NODE_ENV=production

# For development (optional, defaults to localhost)
BASE_URL=http://localhost:3001
NODE_ENV=development
```

### Automatic URL Generation

The application now automatically generates the correct base URL based on the environment:

- **Production** (`NODE_ENV=production`): Uses `https://uconsultingats.com`
- **Development** (`NODE_ENV=development` or unset): Uses `http://localhost:3001`
- **Custom**: Set `BASE_URL` environment variable to override

## Updating Existing Data

If you have existing applications with localhost URLs, run this script to update them:

```bash
# Set your production BASE_URL first
export BASE_URL=https://uconsultingats.com

# Run the update script
node scripts/update-file-urls.js
```

## Testing

Test your file access configuration:

```bash
node scripts/test-file-access.js
```

This will show you:
- Current base URL configuration
- Sample file URLs from your database
- Whether any URLs still need updating

## File Serving

Files are served through these endpoints:
- `/api/files/{fileId}/image` - For image files
- `/api/files/{fileId}/pdf` - For PDF and other document files

All file endpoints require authentication (Authorization header).

## CORS Configuration

The server is configured with CORS enabled, allowing cross-origin requests for file access.

## Deployment Checklist

1. ✅ Set `BASE_URL=https://uconsultingats.com` in production
2. ✅ Set `NODE_ENV=production` in production  
3. ✅ Run the update script to fix existing URLs
4. ✅ Test file access from different machines
5. ✅ Verify CORS is working for cross-origin requests

## Troubleshooting

### Files still showing localhost URLs
- Run `node scripts/update-file-urls.js` to update existing data
- Check that `BASE_URL` environment variable is set correctly

### Files not accessible from other machines
- Verify the server is accessible from external networks
- Check firewall settings
- Ensure CORS is enabled (it is by default)

### Authentication issues
- All file endpoints require valid JWT tokens
- Check that the Authorization header is being sent with requests


