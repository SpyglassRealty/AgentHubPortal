# HTML Import Feature for Mission Control Page Builder

This feature allows users to import existing HTML pages and automatically convert them into Mission Control page builder blocks.

## Features

### 🎯 Smart Section Detection
- Automatically identifies common page patterns:
  - Hero sections with backgrounds
  - Two-column layouts (image/video + text)
  - Feature cards and grids
  - Testimonial sections
  - FAQ sections
  - Service lists
  - Community/neighborhood grids

### 🎨 Style Preservation
- Maintains background colors and themes
- Preserves text alignment and spacing
- Converts inline styles to widget properties

### 📸 Asset Management
- Identifies all images in the HTML
- Queues them for download and re-hosting
- Updates URLs to point to Mission Control CDN

### 🔍 SEO Preservation
- Extracts meta titles and descriptions
- Preserves canonical URLs
- Captures Open Graph data

## Implementation Steps

### 1. Add Dependencies

```bash
npm install react-dropzone lucide-react
```

### 2. Add Parser and Components

Copy these files to your project:
- `html-import-parser.js` - Core parsing logic
- `HTMLImportWidget.jsx` - React UI component
- `page-builder-integration.jsx` - Integration example

### 3. Update Page Builder

Add the import button to your page builder toolbar:

```jsx
import HTMLImportWidget from './HTMLImportWidget';

// In your page builder toolbar
<Button onClick={() => setShowImportModal(true)}>
  <Upload className="w-4 h-4 mr-2" />
  Import HTML
</Button>
```

### 4. Add API Endpoint

Create an endpoint to handle the import and asset processing:

```javascript
// /api/pages/import.js
export async function POST(req) {
  const { blocks, seo, title } = await req.json();
  
  // Process blocks and download assets
  const processedBlocks = await processBlocks(blocks);
  
  // Create page
  const page = await createPage({
    title,
    blocks: processedBlocks,
    seo
  });
  
  return Response.json(page);
}
```

## Usage

### For Users

1. Click "Import HTML" in the page builder
2. Drag and drop an HTML file onto the dropzone
3. Review the detected sections and page details
4. Click "Create Page" to import
5. The page opens in draft mode for final edits

### Supported HTML Patterns

The parser recognizes these common patterns:

```html
<!-- Hero Section -->
<section class="hero">
  <h1>Main Headline</h1>
</section>

<!-- Two Column -->
<div class="split">
  <div class="split__img">
    <img src="..." />
  </div>
  <div class="split__text">
    <h2>Heading</h2>
    <p>Content...</p>
  </div>
</div>

<!-- Feature Cards -->
<div class="cards-3">
  <div class="card">
    <img src="..." />
    <div class="card__body">
      <p>Description</p>
    </div>
  </div>
</div>

<!-- Testimonials -->
<div class="testimonials-grid">
  <div class="testimonial-card">
    <blockquote>Quote text</blockquote>
    <cite>Author</cite>
  </div>
</div>
```

## Widget Mappings

| HTML Pattern | Mission Control Widget |
|-------------|----------------------|
| Hero section | `idx-hero` |
| Split/two-column | `idx-two-column` |
| Card grids | `idx-cards` |
| Testimonials | `idx-testimonials` |
| Service lists | `idx-features` |
| FAQ sections | `faq` |
| Text content | `text` |
| Community grids | `idx-neighborhoods` |

## Customization

### Add New Pattern Detection

```javascript
// In parseSection() method
if (section.querySelector('.custom-pattern')) {
  return this.parseCustomSection(section);
}

parseCustomSection(section) {
  return {
    type: 'custom-widget',
    props: {
      // Extract relevant data
    }
  };
}
```

### Modify Widget Mappings

Update the `widgetMap` in the parser constructor:

```javascript
this.widgetMap = {
  hero: 'your-hero-widget',
  cards: 'your-cards-widget',
  // etc.
};
```

## Best Practices

1. **Preview First**: Always show users what will be imported
2. **Start as Draft**: Import pages as drafts for review
3. **Handle Errors**: Gracefully handle malformed HTML
4. **Preserve Links**: Maintain internal/external links
5. **Asset Validation**: Verify images are accessible before import

## Limitations

- JavaScript functionality is not imported
- Complex CSS animations are simplified
- Custom fonts need manual setup
- Form functionality requires reconnection
- Third-party widgets need replacement

## Future Enhancements

- [ ] Batch import multiple HTML files
- [ ] Import from URL (not just file upload)
- [ ] Custom CSS extraction and conversion
- [ ] Undo/redo during import preview
- [ ] Template detection for common CMSs
- [ ] Asset optimization during import