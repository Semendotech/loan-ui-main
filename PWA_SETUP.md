# PWA Setup Instructions

## PWA Features Implemented

✅ **Manifest File** - Located at `public/manifest.json`
✅ **Service Worker** - Located at `public/sw.js`
✅ **Install Button** - Shows below scroll-to-top button when app is installable
✅ **Installation Detection** - Automatically hides button if app is already installed

## Required Icons

You need to create and add PWA icons to the `public` folder:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

You can generate these icons using:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Or any image editor

## Testing PWA

1. Build and start your Next.js app:
   ```bash
   npm run build
   npm start
   ```

2. Open in Chrome/Edge (mobile or desktop)

3. The install button should appear if:
   - App is not already installed
   - Browser supports PWA installation
   - App meets PWA criteria (HTTPS, manifest, service worker)

4. After installation, the button will automatically hide

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS) - Uses "Add to Home Screen"
- ✅ Firefox (Limited support)

## Notes

- The install button appears below the scroll-to-top button (24px gap)
- Service worker is automatically registered on app load
- Manifest is linked via Next.js metadata

