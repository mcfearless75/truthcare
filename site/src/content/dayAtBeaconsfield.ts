/**
 * Copy for /a-day-at-beaconsfield. Each `body` string is composed from
 * phrases already approved and live elsewhere on the site — see the matching
 * item(s) in content/support.ts's SUPPORT.howWeHelp.list, named in each
 * comment.
 *
 * Deliberately NOT a timed schedule. Beaconsfield House is CQC-regulated, so
 * stating specific times or meals that haven't been verified against actual
 * practice would be a compliance risk, not just a copywriting choice.
 *
 * The named activities in `activities` below are the one exception, and the
 * distinction is provenance, not tone: they were supplied directly by
 * Kumarasen Pillay (nominated individual / provider) on 2026-08-15 as a
 * description of what the service actually offers. That makes them verified
 * rather than invented. The original rule still binds anything else — do not
 * add activities, times or meals from imagination or inference, only from the
 * provider. Note they describe what a day CAN hold, not a fixed rota, which
 * is why the lead-in says "often" and swimming is explicitly an option.
 * See docs/superpowers/specs/2026-08-14-sensitive-interactive-experience-design.md
 * §4 before adding anything more specific.
 */
export const DAY_AT_BEACONSFIELD = {
  eyebrow: "Take a Look Inside",
  heading: "A Day at Beaconsfield House",
  intro:
    "There's no single timetable here — every person's day is built around their own abilities, interests and goals. This is a sense of what that generally looks like, not a schedule.",
  bands: [
    {
      id: "morning",
      label: "Morning",
      imageKey: "beaconsfield-house-ensuite-bedroom-01",
      alt: "An en-suite bedroom at Beaconsfield House, with a made bed, wardrobe and natural light from the window.",
      // Draws on: "Personal care support delivered with dignity and
      // respect" + "Support with daily living skills (including cooking,
      // laundry and routines)". "Support with meal preparation" added
      // 2026-08-15 at the provider's request.
      body: "Mornings start at each person's own pace, with personal care support delivered with dignity and respect. Daily living skills are built into the day as part of rehabilitation rather than separate from it — support with meal preparation, laundry and everyday routines.",
    },
    {
      id: "afternoon",
      label: "Afternoon",
      imageKey: "lifestyle-group",
      alt: "A mixed group of adults, including a wheelchair user, talking and laughing together during a group session.",
      // Draws on: "Structured slow-stream rehabilitation aligned to
      // personalised goals" + "Cognitive and executive function support
      // (planning, memory, attention and problem-solving)" +
      // "Community-based rehabilitation to rebuild independence outside
      // the home"
      body: "Afternoons often mean structured, slow-stream rehabilitation aligned to each person's own goals — cognitive and executive function support alongside community-based rehabilitation that helps rebuild independence outside the home. Being a short distance from the parks and the seafront means a good deal of that happens out in the community.",
      // Provider-supplied 2026-08-15 (see file header). Listed under the
      // afternoon band but introduced as "morning or afternoon", because the
      // provider described them as spanning both rather than belonging to a
      // fixed slot — repeating the same list in two bands would imply a rota
      // the service does not run.
      activitiesHeading: "Out in the community, morning or afternoon",
      activities: [
        "Walks to the local parks and the seafront",
        "Shopping trips",
        "Group and individual leisure activities — tenpin bowling, the cinema, mini golf",
        "Twice-weekly swimming sessions at Hutton Moor Leisure Centre, as an option",
      ],
    },
    {
      id: "evening",
      label: "Evening",
      imageKey: "beaconsfield-house-interior-lounge-wide",
      alt: "The main lounge at Beaconsfield House, with a large corner sofa, an upright piano and a dining table set in the bay window.",
      // Draws on: "Emotional well-being support and strategies for coping
      // and adjustment"
      body: "Evenings are unstructured time in the communal lounge — space for emotional wellbeing support and coping strategies, or simply time with family and the wider household.",
    },
  ],
  closing: {
    heading: "See the rest of the house",
    body: "This is one slice of what a day can hold. The full 360° tour shows every room mentioned here, and more.",
    cta: { label: "Take the Virtual Tour", href: "/virtual-tour" },
  },
} as const;
