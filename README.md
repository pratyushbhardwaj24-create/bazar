# Maa Enterprises – tiles & marble, Aurangabad (Bihar)

Static site for the Maa Enterprises tile and marble showroom on MG Road, Aurangabad, Bihar. No backend and no build step.

## What's on the page

- **3D room visualiser** (Three.js): change the floor and feature-wall tiles, the laying pattern (straight, offset, diagonal) and the grout colour. Drag to orbit, scroll or pinch to zoom.
- **Range**: procedural tile sample boards with filters, "Try in 3D room", and a shortlist kept in the browser that you can share.
- **360° storefront** (Three.js panorama viewer) plus a photo strip from the Google Maps listing.
- **Tile calculator**: room size, tile size and wastage give you the number of boxes.
- **Write a Google review**: a button and a QR code that open Google's write-review page for the shop (Place ID `ChIJ7dqHRFn9jDkR5fttxlaj4ek`), a copy-link button for WhatsApp, and a downloadable QR card to print for the counter.
- **Reviews, live open/closed status (IST), hours, Google Map embed, FAQ.**

## SEO

- Title, description and Open Graph tags aim at "tiles shop / marble shop Aurangabad Bihar", with Hindi terms included.
- JSON-LD: `Store` + `HomeAndConstructionBusiness` (address, geo, hours, areas served) and `FAQPage`.
- The name, address and phone match the Google Business Profile exactly.

**After you pick a domain:** add `<link rel="canonical">`, make the `og:image` URL absolute, add a `sitemap.xml`, and uncomment the sitemap line in `robots.txt`.

## Run locally

```bash
python3 -m http.server 3003
```

Then open http://localhost:3003 (any free port works).

## Files

- `index.html`: markup, meta tags and structured data
- `css/styles.css`: design tokens and layout
- `js/textures.js`: canvas-drawn tile and marble textures and tile laying
- `js/room3d.js`: the 3D room
- `js/pano.js`: the 360° viewer
- `js/main.js`: UI wiring (swatches, range, shortlist, calculator, hours, review QR)
- `js/vendor/qrcode.min.js`: qrcode-generator 1.4.4 (MIT), bundled so the QR works offline
- `assets/photos/`: photos from the shop's Google Maps listing
