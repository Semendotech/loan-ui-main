"""
Patch script: fixes scripts/generate-sw.js so every generated public/sw.js
skips service-worker interception for cross-origin requests (e.g. calls to
the Render backend API).

Root cause of "Failed to load uncollected dues":
  The SW's catch-all fetch handler falls back to caches.match(request) on
  any network failure. For API calls that were never cached, caches.match()
  returns undefined, and returning undefined from respondWith() throws:
    TypeError: Failed to convert value to 'Response'
  This masks the app's normal, cleaner "Failed to load" error handling.

Fix:
  Skip SW interception entirely for requests whose origin differs from the
  app's own origin. These pass straight through to the network, so a real
  fetch failure surfaces to the app's existing try/catch + toast instead of
  crashing in the SW. Static asset and page-navigation caching for your own
  domain are completely unaffected.

Run from your loan-ui-main folder:
    python fix_generate_sw.py
"""

import pathlib
import sys

TARGET = pathlib.Path("scripts/generate-sw.js")

OLD = '''self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') {
    return;
  }'''

NEW = '''self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') {
    return;
  }
  // Never intercept cross-origin requests (e.g. calls to the Render
  // backend API). Let them go straight to the network so real fetch
  // failures surface to the app's own error handling, instead of the
  // service worker's cache-fallback logic throwing on uncached URLs.
  if (url.origin !== self.location.origin) {
    return;
  }'''


def main():
    if not TARGET.exists():
        print(f"ERROR: {TARGET} not found. Run this from loan-ui-main folder.")
        sys.exit(1)

    text = TARGET.read_text(encoding="utf-8")

    if NEW in text:
        print("Already patched - nothing to do.")
        return

    if OLD not in text:
        print("ERROR: Could not find the expected block to replace.")
        print("The file may have changed since this patch was written.")
        print("No changes were made.")
        sys.exit(1)

    text = text.replace(OLD, NEW, 1)
    TARGET.write_text(text, encoding="utf-8")
    print(f"Patched {TARGET} successfully.")
    print("Every future build's public/sw.js will bypass cross-origin requests.")
    print("Now run your normal sw-generation step (e.g. `node scripts/generate-sw.js`")
    print("or `npm run build`, whichever your project uses) to regenerate public/sw.js.")


if __name__ == "__main__":
    main()
