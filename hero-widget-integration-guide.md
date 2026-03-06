# Hero Widget Integration Guide

## Quick Start

1. **Install Dependencies**
```bash
npm install react-dropzone
```

2. **Add the Component Files**
- Copy `HeroBlock.jsx` to your blocks directory
- Copy `hero-block.css` to your styles directory

3. **Register the Block**
```javascript
// In your block registry file
import { heroBlockDefinition } from './blocks/HeroBlock';

// Register the block
registerBlock(heroBlockDefinition);
```

4. **Set Up Media Upload Handler**
```javascript
// In your page editor component
const handleMediaUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.url;
};

// Pass to editor
<HeroBlockEditor 
  config={blockConfig}
  onChange={handleConfigChange}
  onMediaUpload={handleMediaUpload}
/>
```

## API Integration

### Save Block Data
```javascript
// POST /api/pages/{pageId}/blocks
{
  type: 'hero-block',
  order: 0,
  settings: {
    // ... hero config
  }
}
```

### Update Block
```javascript
// PATCH /api/pages/{pageId}/blocks/{blockId}
{
  settings: {
    // ... updated config
  }
}
```

## Rendering on Frontend

```javascript
// In your community page component
import { HeroBlockRenderer } from '@/components/blocks/HeroBlock';

const CommunityPage = ({ blocks }) => {
  return (
    <>
      {blocks.map(block => {
        switch(block.type) {
          case 'hero-block':
            return <HeroBlockRenderer key={block.id} config={block} />;
          // ... other block types
        }
      })}
    </>
  );
};
```

## Database Schema

```sql
-- blocks table addition
CREATE TABLE page_blocks (
  id SERIAL PRIMARY KEY,
  page_id INTEGER REFERENCES pages(id),
  type VARCHAR(50) NOT NULL,
  order_index INTEGER NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example settings JSON structure
{
  "background": {
    "imageUrl": "https://cdn.example.com/hero-image.jpg",
    "overlay": {
      "enabled": true,
      "startOpacity": 0.55,
      "endOpacity": 0.40
    }
  },
  "content": {
    "heading": {
      "text": "Four Seasons Private Residences",
      "maxWidth": "760px"
    },
    "subtitle": {
      "text": "Luxury living in <a href='/downtown'>Downtown Austin</a>",
      "maxWidth": "640px"
    },
    "buttons": [{
      "id": "btn1",
      "text": "View Listings",
      "url": "/listings",
      "style": "filled",
      "color": "orange",
      "target": "_self"
    }]
  },
  "layout": {
    "minHeight": "540px",
    "verticalPadding": "80px",
    "horizontalPadding": "24px"
  }
}
```

## Next Steps

1. **Add Drag & Drop Reordering**
   - Use react-beautiful-dnd or similar
   - Update order_index on drop

2. **Preview Mode**
   - Add live preview toggle in editor
   - Show mobile/desktop views

3. **Image Optimization**
   - Auto-resize on upload
   - Generate responsive sizes
   - WebP conversion

4. **A/B Testing Support**
   - Multiple hero variants
   - Analytics integration
   - Conversion tracking

## Common Issues & Solutions

### Image Upload Fails
- Check file size limits
- Verify CORS settings for CDN
- Ensure proper auth tokens

### Styling Conflicts
- Use CSS modules or styled-components
- Namespace all classes
- Check global CSS overrides

### Performance
- Lazy load images
- Use srcset for responsive images
- Minimize re-renders in editor

## Testing Checklist

- [ ] Image upload works
- [ ] All button styles render correctly
- [ ] Links work (internal and external)
- [ ] Mobile responsive behavior
- [ ] HTML in subtitle renders safely
- [ ] Overlay opacity controls work
- [ ] Can add/remove buttons
- [ ] Data saves and loads correctly