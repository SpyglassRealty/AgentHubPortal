# Agent Editor Features - Implementation Documentation

## Overview
The Mission Control Agent Pages backend editor has been enhanced with the following features:
1. HTML Formatting Toolbar with Rich Text Editing
2. Add New Agents Button
3. Multi-Select Office Locations
4. Agent Video URL Field (YouTube/Vimeo support)

## Features Implementation

### 1. HTML Formatting Toolbar
- **Component**: `RichTextEditor.tsx`
- **Location**: `/client/src/components/RichTextEditor.tsx`
- **Features**:
  - Visual editing mode with formatting toolbar (Bold, Italic, Headings, Lists, Links, Images)
  - HTML source code editing mode (toggle between Visual/HTML)
  - YouTube video embedding support
  - Undo/Redo functionality
  - Based on Tiptap editor (ProseMirror)

### 2. Add New Agents Button
- **Location**: Top-right of Agent Directory Editor
- **Functionality**: 
  - Creates a new agent with empty fields
  - Validates required fields before saving
  - Automatically generates subdomain based on agent name

### 3. Multi-Select Office Locations
- **Available Options**: Austin, Houston, Corpus Christi
- **Storage**: Comma-separated values in `officeLocation` field
- **UI**: Checkbox selection with visual feedback
- **Validation**: At least one office must be selected

### 4. Agent Video URL Field
- **Supported Platforms**: YouTube, Vimeo
- **Validation**: Real-time URL validation
- **Database Field**: `videoUrl` in `agent_directory_profiles` table

## Database Schema
The `agent_directory_profiles` table already includes:
- `officeLocation` (text) - Stores comma-separated office locations
- `videoUrl` (varchar 500) - Stores YouTube/Vimeo URLs

## API Endpoints

### Create New Agent
```
POST /api/admin/agents
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "officeLocation": "Austin, Houston",
  "bio": "<p>Rich HTML content...</p>",
  "videoUrl": "https://www.youtube.com/watch?v=..."
}
```

### Update Agent
```
PUT /api/admin/agents/:id
Content-Type: application/json

{
  // Same fields as create
}
```

## Usage Instructions

### Adding a New Agent
1. Click "Add New Agent" button in the top-right corner
2. Fill in required fields (name, email, office locations)
3. Use the rich text editor for the bio
4. Add social media links and video URL as needed
5. Click "Create Agent" to save

### Editing Agent Bio with HTML
1. Select an agent from the list
2. In the bio field, click the "HTML" button in the toolbar
3. Edit the raw HTML code
4. Click "Visual" to return to visual editing mode

### Selecting Multiple Office Locations
1. In the Office Locations section, check all applicable offices
2. At least one office must be selected
3. Selected offices are displayed as a comma-separated list

### Adding Agent Video
1. Paste a YouTube or Vimeo URL in the "Agent Video URL" field
2. The field validates the URL format in real-time
3. Supported formats:
   - YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`
   - YouTube short: `https://youtu.be/VIDEO_ID`
   - Vimeo: `https://vimeo.com/VIDEO_ID`

## Next Steps

1. **Test the Implementation**:
   - Create test agents with various office combinations
   - Test HTML editing in different browsers
   - Verify video URL validation

2. **Frontend Display**:
   - Update the public agent profile pages to display:
     - Multiple office locations
     - Embedded videos
     - Rich HTML bios

3. **Additional Enhancements**:
   - Add more office locations as needed
   - Implement drag-and-drop image uploads for the rich text editor
   - Add preview mode for agent profiles

## Dependencies Added
- `@tiptap/react` - Core editor component
- `@tiptap/starter-kit` - Basic formatting extensions
- `@tiptap/extension-link` - Link support
- `@tiptap/extension-image` - Image support
- `@tiptap/extension-youtube` - YouTube video embedding

## Files Modified
1. `/client/src/pages/admin/AgentEditor.tsx` - Main editor component
2. `/client/src/components/RichTextEditor.tsx` - New rich text editor component
3. `/server/agentRoutes.ts` - Already supports all required fields

## Notes
- The bio field now stores HTML content instead of plain text
- Office locations are stored as comma-separated values for flexibility
- Video URLs are validated on the client side for better UX
- The rich text editor supports both visual and HTML editing modes