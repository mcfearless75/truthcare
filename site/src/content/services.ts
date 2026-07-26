export const SERVICES = {
  heading: "Our Services",
  beaconsfield: {
    heading: "Beaconsfield House, Weston-Super-Mare",
    intro:
      "A six bed transitional and residential ABI service designed to foster independence and provide a supportive, empowering environment that enables effective neurorehabilitation. Ideally located within walking distance of the seafront, shops, cafés, cinema, and leisure facilities.",
    atAGlance: {
      heading: "At A Glance",
      items: [
        "Spacious, well-furnished ensuite bedrooms",
        "Fully equipped kitchen/diner",
        "Utility with laundry facilities",
        "Large lounge and dining room, with a piano and TV",
        "Dedicated sensory and therapy room",
        "Secure garden, with outdoor dining, raised beds for gardening and a sensory area",
      ],
    },
  },
  /**
   * New copy for this build. The live page repeats the same photo gallery three
   * times with no heading at all; here it is rendered once, introduced, and the
   * full set lives on /virtual-tour.
   */
  gallery: {
    heading: "Inside Beaconsfield House",
    hint: "Six photographs of the house. Select any one to open it full size, or see the full set on the tour page.",
    label: "Photographs of Beaconsfield House",
    cta: { label: "Take a Look Inside", href: "/virtual-tour" },
  },
  cta: { label: "CONTACT US", href: "/contact-us" },
} as const;
