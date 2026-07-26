export interface Faq {
  question: string;
  answer: string; // may contain \n\n for paragraphs
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string; // key into image manifest, e.g. "team-caz-icke"
}

export interface ServiceValue {
  title: string; // e.g. "WELL LED"
  body: string;
  icon: string; // image key, e.g. "icon-well-led"
}

export interface GalleryImage {
  key: string; // image key
  alt: string; // rewritten, human alt text
  caption?: string;
}
