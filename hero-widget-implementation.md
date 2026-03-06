# Hero Block Widget Implementation

## Component Structure

### 1. Widget Configuration Schema
```typescript
interface HeroBlockConfig {
  id: string;
  type: 'hero-block';
  settings: {
    background: {
      imageUrl: string;
      overlay: {
        enabled: boolean;
        startOpacity: number; // 0-1 (default: 0.55)
        endOpacity: number;   // 0-1 (default: 0.40)
      };
      position: 'center' | 'top' | 'bottom';
    };
    content: {
      heading: {
        text: string;
        maxWidth: string; // e.g., "760px"
      };
      subtitle: {
        text: string; // HTML allowed for links
        maxWidth: string; // e.g., "640px"
      };
      buttons: Array<{
        id: string;
        text: string;
        url: string;
        style: 'filled' | 'outline';
        color: 'orange' | 'white' | 'gold';
        target: '_self' | '_blank';
      }>;
    };
    layout: {
      minHeight: string; // e.g., "540px"
      verticalPadding: string; // e.g., "80px"
      horizontalPadding: string; // e.g., "24px"
    };
  };
}
```

### 2. React Component

```jsx
import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Button, TextField, Switch } from '@mui/material';

const HeroBlockEditor = ({ config, onChange }) => {
  const { getRootProps, getInputProps } = useDropzone({
    accept: 'image/*',
    onDrop: (files) => handleImageUpload(files[0])
  });

  const handleImageUpload = async (file) => {
    // Upload logic here
    const imageUrl = await uploadToMediaLibrary(file);
    onChange({
      ...config,
      settings: {
        ...config.settings,
        background: {
          ...config.settings.background,
          imageUrl
        }
      }
    });
  };

  return (
    <div className="hero-block-editor">
      {/* Image Upload */}
      <div {...getRootProps()} className="image-dropzone">
        <input {...getInputProps()} />
        {config.settings.background.imageUrl ? (
          <img src={config.settings.background.imageUrl} alt="Hero background" />
        ) : (
          <p>Drag & drop hero image or click to select</p>
        )}
      </div>

      {/* Overlay Settings */}
      <div className="overlay-settings">
        <Switch
          checked={config.settings.background.overlay.enabled}
          onChange={(e) => updateOverlay('enabled', e.target.checked)}
        />
        <label>Dark Overlay</label>
      </div>

      {/* Content Editing */}
      <TextField
        fullWidth
        label="Heading"
        value={config.settings.content.heading.text}
        onChange={(e) => updateContent('heading', e.target.value)}
        margin="normal"
      />

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Subtitle (HTML allowed)"
        value={config.settings.content.subtitle.text}
        onChange={(e) => updateContent('subtitle', e.target.value)}
        margin="normal"
      />

      {/* Button Editor */}
      <ButtonEditor 
        buttons={config.settings.content.buttons}
        onChange={(buttons) => updateButtons(buttons)}
      />
    </div>
  );
};
```

### 3. Frontend Renderer

```jsx
const HeroBlockRenderer = ({ config }) => {
  const { settings } = config;
  const { background, content, layout } = settings;

  const heroStyle = {
    minHeight: layout.minHeight,
    background: `
      ${background.overlay.enabled 
        ? `linear-gradient(
            rgba(0,0,0,${background.overlay.startOpacity}), 
            rgba(0,0,0,${background.overlay.endOpacity})
          ),` 
        : ''
      }
      url('${background.imageUrl}') ${background.position}/cover no-repeat
    `.trim()
  };

  return (
    <section className="hero" style={heroStyle}>
      <div className="hero__inner">
        <h1 style={{ maxWidth: content.heading.maxWidth }}>
          {content.heading.text}
        </h1>
        <p 
          className="hero__sub"
          style={{ maxWidth: content.subtitle.maxWidth }}
          dangerouslySetInnerHTML={{ __html: content.subtitle.text }}
        />
        <div className="hero__btns">
          {content.buttons.map(button => (
            <a 
              key={button.id}
              className={`btn btn--${button.style === 'filled' ? 'filled' : button.color}`}
              href={button.url}
              target={button.target}
            >
              {button.text}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
```

### 4. CSS Module

```css
/* hero-block.module.css */
.hero {
  position: relative;
  display: flex;
  align-items: center;
  color: #fff;
}

.hero__inner {
  padding: var(--hero-v-padding, 80px) var(--hero-h-padding, 24px);
  max-width: var(--max-w);
  margin: 0 auto;
  width: 100%;
}

.hero h1 {
  font-size: clamp(1.8rem, 4vw, 2.9rem);
  font-weight: 900;
  line-height: 1.15;
  margin-bottom: 20px;
}

.hero__sub {
  font-size: 1.05rem;
  color: rgba(255,255,255,.88);
  line-height: 1.8;
  margin-bottom: 32px;
}

.hero__sub a {
  color: rgba(255,255,255,.8);
  text-decoration: underline;
}

.hero__btns {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

/* Responsive */
@media (max-width: 580px) {
  .hero__btns {
    flex-direction: column;
  }
}
```

### 5. Default Configuration

```javascript
export const defaultHeroConfig = {
  id: generateId(),
  type: 'hero-block',
  settings: {
    background: {
      imageUrl: '',
      overlay: {
        enabled: true,
        startOpacity: 0.55,
        endOpacity: 0.40
      },
      position: 'center'
    },
    content: {
      heading: {
        text: 'Your Headline Here',
        maxWidth: '760px'
      },
      subtitle: {
        text: 'Add your subtitle text here. You can include <a href="#">links</a> too.',
        maxWidth: '640px'
      },
      buttons: [
        {
          id: 'btn1',
          text: 'Primary Action',
          url: '#',
          style: 'filled',
          color: 'orange',
          target: '_self'
        },
        {
          id: 'btn2',
          text: 'Secondary Action',
          url: '#',
          style: 'outline',
          color: 'white',
          target: '_self'
        }
      ]
    },
    layout: {
      minHeight: '540px',
      verticalPadding: '80px',
      horizontalPadding: '24px'
    }
  }
};
```

## Integration Steps

1. **Add to Block Registry**
```javascript
import { HeroBlockEditor, HeroBlockRenderer } from './blocks/hero-block';

registerBlock('hero-block', {
  title: 'Hero Section',
  icon: 'image',
  category: 'media',
  editor: HeroBlockEditor,
  renderer: HeroBlockRenderer,
  defaultConfig: defaultHeroConfig
});
```

2. **Media Library Integration**
- Connect image upload to existing media library
- Support drag & drop
- Image optimization on upload

3. **Preview Mode**
- Real-time preview in editor
- Mobile/desktop viewport toggles

4. **Validation**
- Required fields (image, heading)
- URL validation for buttons
- Image format/size limits

## Features to Consider

1. **Advanced Options**
   - Video background support
   - Parallax scrolling
   - Animation on scroll
   - Custom CSS classes

2. **SEO Options**
   - Alt text for background image
   - Schema markup toggle
   - H1 vs H2 toggle for heading

3. **A/B Testing**
   - Multiple button variations
   - Headline testing
   - Image variations

## Migration Notes

For existing Four Seasons-style pages:
1. Extract current hero data
2. Map to new widget schema
3. Preserve existing styling
4. Test responsive behavior