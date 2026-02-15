# Favicon Setup Instructions

## Current Status
The application currently uses SVG favicons which work in modern browsers. However, for maximum compatibility, you may want to generate ICO and PNG files.

## Files in Use
- `favicon.svg` - Primary favicon (32x32, scalable)
- `icon-192.png.svg` - PWA icon (192x192)
- `icon-512.png.svg` - PWA icon (512x512)
- `og-image.svg` - Social media preview image (1200x630)

## To Generate ICO and PNG Files

### Option 1: Using Online Tools
1. Visit https://realfavicongenerator.net/
2. Upload `favicon.svg`
3. Configure settings:
   - iOS: Use the SVG
   - Android: Use the SVG
   - Windows: Generate ICO
4. Download and replace files in `/public` directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick if not already installed
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Convert SVG to ICO (multiple sizes)
convert public/favicon.svg -define icon:auto-resize=16,32,48 public/favicon.ico

# Convert to PNG files
convert public/favicon.svg -resize 192x192 public/icon-192.png
convert public/favicon.svg -resize 512x512 public/icon-512.png
```

### Option 3: Using Node.js Package
```bash
npm install -g sharp-cli

# Generate PNG files
sharp -i public/favicon.svg -o public/icon-192.png resize 192 192
sharp -i public/favicon.svg -o public/icon-512.png resize 512 512
```

## After Generating Files
Update `public/manifest.json` to reference the PNG files:
```json
"icons": [
  {
    "src": "/favicon.svg",
    "sizes": "any",
    "type": "image/svg+xml"
  },
  {
    "src": "/icon-192.png",
    "sizes": "192x192",
    "type": "image/png"
  },
  {
    "src": "/icon-512.png",
    "sizes": "512x512",
    "type": "image/png"
  }
]
```

## Design Details
The favicon uses:
- **Primary Color**: #3B82F6 (Blue)
- **Icon**: Dashboard grid (4 squares)
- **Style**: Modern, minimal, professional
- **Represents**: Admin panel / management interface

