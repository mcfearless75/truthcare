/**
 * Pull Truth Care Group's public Google reviews into
 * site/src/content/google-reviews.json.
 *
 * Places API (New) returns at most five reviews. That is enough here: the
 * profile had two reviews on 2026-10-08. Do not scrape Maps — Google's terms
 * forbid it, and a cached copy must be refreshed within 30 days.
 *
 * Requires GOOGLE_PLACES_API_KEY (Places API (New) enabled, billing on).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLACE_ID = "ChIJt3X9muj5cUgRMtA9ShQ_S4w";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "site",
  "src",
  "content",
  "google-reviews.json",
);

const key = process.env.GOOGLE_PLACES_API_KEY;
if (!key) {
  console.error("GOOGLE_PLACES_API_KEY is not set");
  process.exit(1);
}

const res = await fetch(
  `https://places.googleapis.com/v1/places/${PLACE_ID}`,
  {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      "Accept-Language": "en-GB",
    },
  },
);

if (!res.ok) {
  const body = await res.text();
  console.error(`Places API ${res.status}: ${body}`);
  process.exit(1);
}

const place = await res.json();
const reviews = (place.reviews ?? [])
  .filter((review) => review.text?.text)
  .map((review) => ({
    author: review.authorAttribution?.displayName ?? "Google reviewer",
    rating: review.rating ?? null,
    relativeTime: review.relativePublishTimeDescription ?? null,
    publishTime: review.publishTime ?? null,
    text: review.text.text.trim(),
  }));

const payload = {
  fetchedAt: new Date().toISOString(),
  placeId: PLACE_ID,
  rating: place.rating ?? null,
  userRatingCount: place.userRatingCount ?? reviews.length,
  mapsUrl:
    place.googleMapsUri ??
    `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
  reviews,
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Wrote ${reviews.length} review(s), rating ${payload.rating} from ${payload.userRatingCount}`,
);
