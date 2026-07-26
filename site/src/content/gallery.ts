import type { GalleryImage } from "./types";

/**
 * The real photographs of Beaconsfield House, in walk-through order: arriving at
 * the building, the communal rooms, the bedrooms, the sensory and therapy room,
 * then the garden.
 *
 * Nine photographs exist in `lib/images.json`, not the ten the scope document
 * estimated — the live Wix gallery padded its set with stock lifestyle imagery
 * (`lifestyle-cooking`, `lifestyle-dogwalk`, `lifestyle-group`). Those are
 * deliberately excluded: a gallery presented as "this is our home" must only
 * contain the home.
 *
 * Alt text is written from the photographs themselves and describes what a
 * visitor would take in on walking into the room. None of the machine-vision
 * alt text from the Wix original survives.
 */
export const GALLERY: GalleryImage[] = [
  {
    key: "beaconsfield-house-exterior-front",
    alt: "The front of Beaconsfield House: a three-storey Victorian villa in grey and honey stone, with twin gables, deep bay windows and a black front door, set behind its own marked parking bays.",
    caption: "Beaconsfield House from the road",
  },
  {
    key: "beaconsfield-house-exterior-side",
    alt: "Beaconsfield House in sunshine, showing the carved stone gables, three tiers of bay windows and the level, marked car park directly in front of the building.",
    caption: "Arriving at the house",
  },
  {
    key: "beaconsfield-house-interior-lounge-wide",
    alt: "The main lounge, with a large corner sofa and a low white table at one end and an oval dining table for six set into the bay window at the other. An upright piano stands against the wall and the original decorative plasterwork runs round the ceiling.",
    caption: "The main lounge",
  },
  {
    key: "beaconsfield-house-interior-lounge-piano",
    alt: "The dining end of the lounge: an oval table with six chairs in the bay window, an upright piano with its stool alongside, a wall-mounted television and board games stacked on the sideboard.",
    caption: "Lounge and dining area",
  },
  {
    key: "beaconsfield-house-ensuite-bedroom-01",
    alt: "A large en-suite bedroom with a double bed, a bedside table and lamp, a chest of drawers, and a small desk and chair set into the bay window. Deep cornicing runs round the ceiling and the carpet is soft grey.",
    caption: "En-suite bedroom",
  },
  {
    key: "beaconsfield-house-ensuite-bedroom-02",
    alt: "A second en-suite bedroom under a gently sloping ceiling, with a double bed, a chest of drawers and a plant, and a white desk and chair beneath a tall sash window.",
    // Distinct from the first bedroom's caption so the two thumbnails do not
    // announce with identical accessible names.
    caption: "A second en-suite bedroom",
  },
  {
    key: "beaconsfield-house-interior-sensory-room",
    alt: "The sensory room, with two windows looking out over neighbouring rooftops, a tropical fish tank, soft green lighting tracing the line of the sloped ceiling, and two large bean bags in the corner.",
    caption: "The sensory room",
  },
  {
    key: "beaconsfield-house-interior-living-sloped",
    alt: "The therapy and activity end of the same top-floor room, with a round table and chairs, a sideboard, an oak console table and bean-bag seating beneath a high vaulted ceiling.",
    caption: "Therapy and activity space",
  },
  {
    key: "beaconsfield-house-garden-patio",
    alt: "The enclosed rear garden: a paved patio with wooden benches, raised timber planting beds along a stone retaining wall, and a close-boarded fence around the boundary.",
    caption: "The secure garden",
  },
];

export const GALLERY_BY_KEY: Record<string, GalleryImage> = Object.fromEntries(
  GALLERY.map((image) => [image.key, image])
);

function pick(keys: readonly string[]): GalleryImage[] {
  return keys.map((key) => {
    const image = GALLERY_BY_KEY[key];
    if (!image) throw new Error(`Unknown gallery key: ${key}`);
    return image;
  });
}

/**
 * The six photographs shown once on /services-facilities. Chosen to mirror the
 * "At A Glance" list on that page rather than simply taking the first six of the
 * walk-through: exterior, lounge, dining room with the piano and TV, an en-suite
 * bedroom, the sensory room, and the secure garden.
 */
export const SERVICES_GALLERY: GalleryImage[] = pick([
  "beaconsfield-house-exterior-front",
  "beaconsfield-house-interior-lounge-wide",
  "beaconsfield-house-interior-lounge-piano",
  "beaconsfield-house-ensuite-bedroom-01",
  "beaconsfield-house-interior-sensory-room",
  "beaconsfield-house-garden-patio",
]);

/**
 * Copy for /virtual-tour. `featuresHeading` and `features` are the live tour
 * page's own heading and four bullets, verbatim. The page title changes to
 * "Take a Look Inside" (spec §3 — approved rename, URL unchanged) and the lede,
 * gallery heading and closing CTA are new copy written for this build, because
 * the live page has no gallery to introduce.
 */
export const TOUR = {
  eyebrow: "Supporting Adult Independence",
  heading: "Take a Look Inside",
  /** Header photograph. Its alt text is reused from GALLERY, not rewritten. */
  headerImage: "beaconsfield-house-exterior-side",
  lede: "Nothing replaces walking round the house itself, but these photographs show Beaconsfield House exactly as it is: the communal rooms, the en-suite bedrooms, the sensory and therapy space, and the secure garden.",
  featuresHeading: "Step inside Beaconsfield House",
  features: [
    "Six spacious en-suite bedrooms",
    "Dedicated therapy spaces",
    "Communal living areas",
    "Secure outdoor garden and dining areas",
  ],
  gallery: {
    heading: "The house, room by room",
    hint: "Select any photograph to open it full size.",
    label: "Photographs of Beaconsfield House",
  },
  closing: {
    heading: "Come and see it for yourself",
    body: "We welcome visits from individuals, families, case managers and commissioners. Get in touch and we will arrange a time that suits you.",
    cta: { label: "Arrange a Visit", href: "/contact-us" },
  },
} as const;
