import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './hero-block.css';

// Editor Component
export const HeroBlockEditor = ({ config, onChange, onMediaUpload }) => {
  const [activeButton, setActiveButton] = useState(0);

  const handleDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && onMediaUpload) {
      try {
        const uploadedUrl = await onMediaUpload(file);
        updateSetting(['background', 'imageUrl'], uploadedUrl);
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
  }, [onMediaUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: false
  });

  const updateSetting = (path, value) => {
    const newConfig = { ...config };
    let current = newConfig.settings;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    onChange(newConfig);
  };

  const updateButton = (index, field, value) => {
    const newButtons = [...config.settings.content.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    updateSetting(['content', 'buttons'], newButtons);
  };

  const addButton = () => {
    const newButton = {
      id: `btn${Date.now()}`,
      text: 'New Button',
      url: '#',
      style: 'outline',
      color: 'white',
      target: '_self'
    };
    updateSetting(['content', 'buttons'], [...config.settings.content.buttons, newButton]);
  };

  const removeButton = (index) => {
    const newButtons = config.settings.content.buttons.filter((_, i) => i !== index);
    updateSetting(['content', 'buttons'], newButtons);
  };

  return (
    <div className="hero-editor">
      {/* Image Upload Section */}
      <div className="editor-section">
        <h3>Background Image</h3>
        <div {...getRootProps()} className={`image-dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          {config.settings.background.imageUrl ? (
            <div className="image-preview">
              <img src={config.settings.background.imageUrl} alt="Hero background" />
              <button 
                className="change-image-btn"
                onClick={(e) => e.stopPropagation()}
              >
                Change Image
              </button>
            </div>
          ) : (
            <div className="dropzone-empty">
              <svg className="upload-icon" viewBox="0 0 24 24" width="48" height="48">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5z"/>
              </svg>
              <p>Drag & drop an image or click to browse</p>
              <p className="file-hint">Recommended: 1920x1080 or larger</p>
            </div>
          )}
        </div>

        {/* Overlay Controls */}
        <div className="overlay-controls">
          <label>
            <input
              type="checkbox"
              checked={config.settings.background.overlay.enabled}
              onChange={(e) => updateSetting(['background', 'overlay', 'enabled'], e.target.checked)}
            />
            Enable dark overlay
          </label>
          
          {config.settings.background.overlay.enabled && (
            <div className="opacity-sliders">
              <div className="slider-group">
                <label>Top opacity: {Math.round(config.settings.background.overlay.startOpacity * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.settings.background.overlay.startOpacity * 100}
                  onChange={(e) => updateSetting(['background', 'overlay', 'startOpacity'], e.target.value / 100)}
                />
              </div>
              <div className="slider-group">
                <label>Bottom opacity: {Math.round(config.settings.background.overlay.endOpacity * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.settings.background.overlay.endOpacity * 100}
                  onChange={(e) => updateSetting(['background', 'overlay', 'endOpacity'], e.target.value / 100)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="editor-section">
        <h3>Content</h3>
        
        <div className="form-group">
          <label>Heading (H1)</label>
          <input
            type="text"
            value={config.settings.content.heading.text}
            onChange={(e) => updateSetting(['content', 'heading', 'text'], e.target.value)}
            placeholder="Enter your headline..."
          />
        </div>

        <div className="form-group">
          <label>Subtitle (HTML supported)</label>
          <textarea
            rows="3"
            value={config.settings.content.subtitle.text}
            onChange={(e) => updateSetting(['content', 'subtitle', 'text'], e.target.value)}
            placeholder="Enter subtitle text. You can use HTML for links..."
          />
          <p className="field-hint">Example: Visit our &lt;a href="/page"&gt;community page&lt;/a&gt;</p>
        </div>
      </div>

      {/* Buttons Section */}
      <div className="editor-section">
        <div className="section-header">
          <h3>Buttons</h3>
          <button className="add-button-btn" onClick={addButton}>+ Add Button</button>
        </div>

        {config.settings.content.buttons.map((button, index) => (
          <div key={button.id} className="button-config">
            <div className="button-header">
              <h4>Button {index + 1}</h4>
              {config.settings.content.buttons.length > 1 && (
                <button 
                  className="remove-btn"
                  onClick={() => removeButton(index)}
                  aria-label="Remove button"
                >
                  ×
                </button>
              )}
            </div>

            <div className="button-fields">
              <div className="form-group">
                <label>Text</label>
                <input
                  type="text"
                  value={button.text}
                  onChange={(e) => updateButton(index, 'text', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>URL</label>
                <input
                  type="text"
                  value={button.url}
                  onChange={(e) => updateButton(index, 'url', e.target.value)}
                  placeholder="https://... or /page-slug"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Style</label>
                  <select
                    value={button.style}
                    onChange={(e) => updateButton(index, 'style', e.target.value)}
                  >
                    <option value="filled">Filled</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <select
                    value={button.color}
                    onChange={(e) => updateButton(index, 'color', e.target.value)}
                  >
                    <option value="orange">Orange (Primary)</option>
                    <option value="white">White</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target</label>
                  <select
                    value={button.target}
                    onChange={(e) => updateButton(index, 'target', e.target.value)}
                  >
                    <option value="_self">Same Window</option>
                    <option value="_blank">New Window</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Layout Options */}
      <div className="editor-section">
        <h3>Layout</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Minimum Height</label>
            <input
              type="text"
              value={config.settings.layout.minHeight}
              onChange={(e) => updateSetting(['layout', 'minHeight'], e.target.value)}
              placeholder="e.g., 540px, 70vh"
            />
          </div>
          <div className="form-group">
            <label>Vertical Padding</label>
            <input
              type="text"
              value={config.settings.layout.verticalPadding}
              onChange={(e) => updateSetting(['layout', 'verticalPadding'], e.target.value)}
              placeholder="e.g., 80px"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Renderer Component
export const HeroBlockRenderer = ({ config }) => {
  const { settings } = config;
  const { background, content, layout } = settings;

  const heroStyle = {
    minHeight: layout.minHeight,
    background: background.overlay.enabled
      ? `linear-gradient(rgba(0,0,0,${background.overlay.startOpacity}), rgba(0,0,0,${background.overlay.endOpacity})), url('${background.imageUrl}') ${background.position || 'center'}/cover no-repeat`
      : `url('${background.imageUrl}') ${background.position || 'center'}/cover no-repeat`
  };

  const innerStyle = {
    padding: `${layout.verticalPadding} ${layout.horizontalPadding}`
  };

  return (
    <section className="hero" style={heroStyle}>
      <div className="hero__inner" style={innerStyle}>
        <h1 style={{ maxWidth: content.heading.maxWidth }}>
          {content.heading.text}
        </h1>
        {content.subtitle.text && (
          <p 
            className="hero__sub"
            style={{ maxWidth: content.subtitle.maxWidth }}
            dangerouslySetInnerHTML={{ __html: content.subtitle.text }}
          />
        )}
        {content.buttons.length > 0 && (
          <div className="hero__btns">
            {content.buttons.map(button => (
              <a 
                key={button.id}
                className={`btn ${button.style === 'filled' ? 'btn--filled' : `btn--${button.color}`}`}
                href={button.url}
                target={button.target}
                rel={button.target === '_blank' ? 'noopener noreferrer' : undefined}
              >
                {button.text}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Default configuration
export const defaultHeroConfig = {
  id: `hero-${Date.now()}`,
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

// Block registration helper
export const heroBlockDefinition = {
  type: 'hero-block',
  title: 'Hero Section',
  icon: '🖼️',
  category: 'media',
  editor: HeroBlockEditor,
  renderer: HeroBlockRenderer,
  defaultConfig: defaultHeroConfig
};