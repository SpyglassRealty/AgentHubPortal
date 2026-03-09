import React from 'react';
import type { CommunityHeroProps } from '../types';

interface CommunityHeroBlockProps {
  props: CommunityHeroProps;
}

export function CommunityHeroBlock({ props }: CommunityHeroBlockProps) {
  const {
    image,
    heading,
    subheading,
    buttonText,
    buttonUrl,
    headingFont,
    headingSize,
    headingWeight,
    subheadingFont,
    subheadingSize,
    subheadingWeight,
    buttonFont,
    buttonFontSize,
    buttonFontWeight,
    buttonTextColor,
    buttonBgColor,
    buttonHoverTextColor,
    buttonHoverBgColor,
    buttonRounded,
    gradientTopOpacity,
    gradientBottomOpacity,
  } = props;

  const fontWeightMap: Record<string, number> = {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  };

  return (
    <div 
      className="relative w-full h-[500px] overflow-hidden"
      style={{ fontFamily: headingFont }}
    >
      {/* Background Image */}
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}

      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, 
            rgba(0, 0, 0, ${gradientTopOpacity / 100}) 0%, 
            rgba(0, 0, 0, ${gradientBottomOpacity / 100}) 100%)`
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="text-center text-white max-w-4xl">
          {/* Heading */}
          <h1 
            className="mb-4"
            style={{
              fontFamily: headingFont,
              fontSize: `${headingSize}px`,
              fontWeight: fontWeightMap[headingWeight] || 700,
              lineHeight: 1.2,
            }}
          >
            {heading}
          </h1>

          {/* Subheading */}
          {subheading && (
            <p 
              className="mb-8 opacity-90"
              style={{
                fontFamily: subheadingFont,
                fontSize: `${subheadingSize}px`,
                fontWeight: fontWeightMap[subheadingWeight] || 400,
                lineHeight: 1.5,
              }}
            >
              {subheading}
            </p>
          )}

          {/* Button */}
          {buttonText && buttonUrl && (
            <a
              href={buttonUrl}
              className="inline-block px-8 py-3 transition-colors duration-200"
              style={{
                fontFamily: buttonFont,
                fontSize: `${buttonFontSize}px`,
                fontWeight: fontWeightMap[buttonFontWeight] || 500,
                color: buttonTextColor,
                backgroundColor: buttonBgColor,
                borderRadius: buttonRounded ? '9999px' : '0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = buttonHoverTextColor;
                e.currentTarget.style.backgroundColor = buttonHoverBgColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = buttonTextColor;
                e.currentTarget.style.backgroundColor = buttonBgColor;
              }}
            >
              {buttonText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}