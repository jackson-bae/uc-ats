/**
 * Extracts the Google Form ID from a Google Form URL
 * @param {string} formUrl - The Google Form URL
 * @returns {string|null} - The extracted form ID or null if invalid
 */
function extractFormIdFromUrl(formUrl) {
    if (!formUrl || typeof formUrl !== 'string') {
        return null;
    }

    // Match Google Form URLs of different formats:
    // https://docs.google.com/forms/d/FORM_ID/viewform
    // https://docs.google.com/forms/d/FORM_ID/edit
    // https://docs.google.com/forms/d/FORM_ID/
    const regex = /\/forms\/d\/([a-zA-Z0-9-_]+)/;
    const match = formUrl.match(regex);
    
    return match ? match[1] : null;
}

export {
    extractFormIdFromUrl
}; 