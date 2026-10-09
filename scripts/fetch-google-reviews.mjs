/**
 * Pull Truth Care Group's public Google reviews into
 * site/src/content/google-reviews.json.
 *
 * Tries Places API (New), then the legacy Place Details endpoint. Both return
 * at most five reviews. Do not scrape Maps. A stored copy must be refreshed
 * within 30 days.
 *
 * Requires GOOGLE_PLACES_API_KEY. Billing must be on. Enable Places API (New)
 * or the legacy Places API, and allow that API on the key.
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

const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
if (!key) {
  console.error("GOOGLE_PLACES_API_KEY is not set");
  process.exit(1);
}

function writePayload(payload) {
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${payload.reviews.length} review(s), rating ${payload.rating} from ${payload.userRatingCount}`,
  );
}

async function fetchNew() {
  const res = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      "Accept-Language": "en-GB",
    },
  });
  const body = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }
  const place = JSON.parse(body);
  return {
    ok: true,
    payload: {
      fetchedAt: new Date().toISOString(),
      placeId: PLACE_ID,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? 0,
      mapsUrl:
        place.googleMapsUri ??
        `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
      reviews: (place.reviews ?? [])
        .filter((review) => review.text?.text)
        .map((review) => ({
          author: review.authorAttribution?.displayName ?? "Google reviewer",
          rating: review.rating ?? null,
          relativeTime: review.relativePublishTimeDescription ?? null,
          publishTime: review.publishTime ?? null,
          text: review.text.text.trim(),
        })),
    },
  };
}

async function fetchLegacy() {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", PLACE_ID);
  url.searchParams.set("fields", "rating,user_ratings_total,url,reviews");
  url.searchParams.set("reviews_sort", "newest");
  url.searchParams.set("language", "en-GB");
  url.searchParams.set("key", key);
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }
  const parsed = JSON.parse(body);
  if (parsed.status !== "OK") {
    return { ok: false, status: res.status, body };
  }
  const place = parsed.result ?? {};
  return {
    ok: true,
    payload: {
      fetchedAt: new Date().toISOString(),
      placeId: PLACE_ID,
      rating: place.rating ?? null,
      userRatingCount: place.user_ratings_total ?? 0,
      mapsUrl: place.url ?? `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
      reviews: (place.reviews ?? [])
        .filter((review) => review.text)
        .map((review) => ({
          author: review.author_name ?? "Google reviewer",
          rating: review.rating ?? null,
          relativeTime: review.relative_time_description ?? null,
          publishTime: review.time ? new Date(review.time * 1000).toISOString() : null,
          text: review.text.trim(),
        })),
    },
  };
}

const newer = await fetchNew();
if (newer.ok) {
  writePayload(newer.payload);
  process.exit(0);
}
console.error(`Places API (New) ${newer.status}: ${newer.body}`);

const legacy = await fetchLegacy();
if (legacy.ok) {
  console.log("Used legacy Place Details.");
  writePayload(legacy.payload);
  process.exit(0);
}
console.error(`Legacy Places API ${legacy.status}: ${legacy.body}`);
process.exit(1);
