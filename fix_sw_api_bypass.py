"""
Patch script: excludes cross-origin backend API requests from the service
worker's fetch handler in public/sw.js.

Root cause of "Failed to load uncollected dues":
  The SW's catch-all fetch handler falls back to caches.match(request) on
  any network failure. For API calls (like /dashboard/uncollected-dues on
  Render) that were never cached, caches.match() returns undefined, and
  returning undefined from a fetch event's respondWith() throws:
    TypeError: Failed to convert value to 'Response'
  This masks the app's normal, cleaner "Failed to load" error handling.

Fix:
  Skip SW interception entirely for requests going to a different origin
  than the app itself (i.e. your Render backend). These requests pass
  straight through to the network, so any real fetch failure surfaces to
  your app's existing try/catch + toast, instead of crashing in the SW.
  Static asset caching and page-navigation caching for your own domain are
  completely unaffected.

Run from your loan-ui-main folder:
    python fix_sw_api_bypass.py
"""

import pathlib
import sys

TARGET = pathlib.Path("public/sw.js")

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
    print("Cross-origin requests (your backend API) now bypass the service")
    print("worker entirely and go straight to the network.")


if __name__ == "__main__":
    main()
