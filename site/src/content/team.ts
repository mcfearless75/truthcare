import type { TeamMember } from "./types";

/**
 * Page-level framing copy for /our-team — new copy for this build (the live
 * site's team page has no heading copy of its own beyond the bios). The six
 * bios below are the client's verbatim copy and are left untouched.
 */
export const TEAM_PAGE = {
  hero: {
    heading: "Meet Our Team",
    intro:
      "Truth Care Group is led by an experienced multidisciplinary team of clinicians, working together around each resident’s personalised rehabilitation plan.",
  },
  ctas: [
    { label: "Arrange a Visit", href: "/contact-us" },
    { label: "Make a Referral", href: "/contact-us?type=referral" },
  ],
  grid: {
    eyebrow: "THE TEAM",
    // Reworded 2026-08-13. This heading previously ended "...therapy and
    // nursing". CQC registered Beaconsfield House with an explicit condition
    // that it must NOT provide nursing care, so a heading advertising
    // "nursing" alongside the services was worth removing even though it was
    // describing staff backgrounds rather than offering nursing care. The
    // lede now draws that distinction explicitly instead of leaving a reader
    // to infer it — individual clinicians' nursing registrations are real and
    // stay in their bios; what changes is that the page no longer implies the
    // service itself is registered for nursing.
    heading: "Specialists across neuropsychiatry, therapy and clinical care",
    lede: "Every resident’s care is shaped by clinicians who work together on one rehabilitation plan, not in separate silos. Our team’s professional backgrounds span neuropsychiatry, therapy and nursing; Beaconsfield House itself is registered to provide personal care rather than nursing care.",
  },
  closing: {
    heading: "Talk to the team behind the care",
    body: "Whether you’re a family member, case manager or care coordinator, we’re happy to talk through a referral or arrange a visit to Beaconsfield House.",
  },
} as const;

export const TEAM: TeamMember[] = [
  {
    name: "Dr Kumi Pillay",
    role: "Founder",
    bio: [
      "Truth Care Group was founded by Dr Kumi Pillay, a neuropsychiatrist committed to delivering high-quality, innovative, person-centred care.",
      "Our wider team includes experienced community specialists, including a neuropsychologist, neuro-occupational therapist, neurophysiotherapist, and neuro-speech and language therapist.",
      "Together, we have developed a slow stream rehabilitation programme designed to help every resident work towards their personalised SMART goals.",
    ].join("\n\n"),
    image: "team-kumi-pillay",
  },
  {
    name: "Dr Henk Swanepoel",
    role: "Clinical Neuropsychologist",
    bio: [
      "With over 20 years of experience in neurorehabilitation, Dr Henk is a Clinical Neuropsychologist specialising in supporting individuals living with the cognitive, emotional, behavioural, and physical effects of acquired and traumatic brain injuries, as well as chronic neurological and neurodegenerative conditions. He is passionate about delivering person-centred care that helps individuals maximise independence, improve quality of life, and work towards meaningful personal goals.",
      "He provides specialist neurocognitive assessments and evidence-based interventions tailored to each individual’s needs, with a strong focus on rehabilitation, recovery, and community reintegration. With extensive leadership experience across acute neurorehabilitation, mental health, and multidisciplinary services, he has a broad understanding of the rehabilitation journey and the challenges associated with transitioning from hospital settings back into the community.",
      "Registered with the HCPC and a Chartered Member and Associate Fellow of the BPS, he believes in compassionate, collaborative care and values co-production throughout the rehabilitation process.",
    ].join("\n\n"),
    image: "team-henk-swanepoel",
  },
  {
    name: "Caz Icke",
    role: "Neurophysiotherapist",
    bio: [
      "Caz Icke is a specialist neuro-physiotherapist with 20 years of experience in neurological rehabilitation across inpatient, outpatient, and community settings in the UK and internationally. Her clinical practice spans stroke, brain and spinal cord injury, long-term neurological conditions, Functional Neurological Disorder, vestibular rehabilitation, and complex spasticity management. She has held senior roles across neurology, neurosurgery, stroke, and brain injury services at Southmead Hospital and Bristol’s Level 1 Brain Injury Rehabilitation Unit. She currently works within the South West regional neurosurgical unit, BNSSG spasticity service and Monmouthshire Health and Social Care. Caz holds a Post Graduate Certificate in Advanced Practice.",
      "Alongside clinical practice, Caz has a passion for rehabilitation innovation and research. She is the founder of SoleSense, an award-winning health technology company developing wearable solutions to improve recovery after neurological injury. As a member of the NHS England Clinical Entrepreneur Programme, she works with universities, clinicians, and industry partners to translate rehabilitation science into practical technologies that improve patient outcomes and expand access to therapy.",
    ].join("\n\n"),
    image: "team-caz-icke",
  },
  {
    name: "Miss Emily Kerr",
    role: "Neurophysiotherapist",
    bio: [
      "Emily Kerr is an experienced specialist neuro-physiotherapist, committed to helping people regain independence after neurological events such as stroke, traumatic brain injury and Guillain–Barré syndrome, as well as supporting older-person rehabilitation and chronic conditions.",
      "With extensive multidisciplinary experience, including ongoing work at the Frenchay Brain Injury Rehabilitation Unit in Bristol, Emily understands the challenges that the transition from hospital to home can bring. She is also an accredited moving and handling trainer, providing bespoke training and practical advice for clients and their support network.",
      "Registered with the HCPC, and a member of the CSP and ACPIN (and registered with the ICO), Emily delivers tailored, client-centred rehabilitation that helps each person progress towards their personalised SMART goals.",
    ].join("\n\n"),
    image: "team-emily-kerr",
  },
  {
    name: "Gerry Roxburgh",
    role: "NeuroSALT",
    bio: [
      "Gerry is an advanced practitioner in eating, drinking and swallowing disorders for adults following acquired and traumatic brain injuries, and with chronic neurological conditions.",
      "Gerry has a special interest in cognitive communication disorders and social cognition impairments, offering interventions to individuals and their families.",
      "With over 25 years of experience in neuro-rehab, Gerry offers bespoke, person-centred, outcome-focused interventions to our residents with communication and swallowing needs",
    ].join("\n\n"),
    image: "team-gerry-roxburgh",
  },
  {
    // NEEDS CONFIRMATION: replaced Mrs Alison Woods (previously "Registered
    // Manager") on 2026-07-27 — she no longer appears on the live team page
    // at all. Live Wix gives Emma Merriman no explicit job title (only the
    // "neuro-occupational therapist" phrase inside her own bio text), so
    // "Neuro-Occupational Therapist" below is inferred, not copied. More
    // importantly: nobody on the live site is currently labelled "Registered
    // Manager" — a legally significant title for a CQC-regulated service.
    // Confirm who holds that role now (may or may not be Emma Merriman) and
    // update both the role label here and this comment once known.
    // Moved to the end of the list 2026-08-12 per client request.
    name: "Emma Merriman",
    role: "Neuro-Occupational Therapist",
    bio: [
      "Emma Merriman is a specialist neuro-occupational therapist with clinical experience dating back to 1995. She has worked across acute neurosciences, stroke rehabilitation, pain management, neurorehabilitation, community services, discharge planning and specialist brain injury settings throughout the UK. Since establishing Emma Merriman Rehabilitation Ltd in 2013, she has provided independent occupational therapy and case management for people with acquired brain injury and complex presentations, including cognitive, behavioural, emotional, executive and family-system challenges.",
      "Emma has particular expertise in cognitive rehabilitation, executive dysfunction and complex needs assessment. Alongside her therapy work, she has extensive experience of the litigation and case management process, coordinating rehabilitation programmes, and managing risk.",
      "Alongside her clinical practice, Emma has contributed to professional development, training and networking across the brain injury and occupational therapy communities. She has designed and delivered training on risk assessment, risk management, the Mental Capacity Act, cognitive and executive difficulties following brain injury, and client-specific support strategies for care teams and support workers. She has supervised case managers, mentored peers and professionals, served as Regional Representative for the Specialist Section of Neurological Practitioners in the South West, and chaired the South West Specialist Section of Independent Occupational Therapists from 2011 to 2025. She also founded and organised Professionals in Brain Injury, a social and educational forum created to strengthen collaboration and knowledge exchange within the brain injury community. She is a registered occupational therapist, an Advanced Member of the BABICM, and is a Registered Case Manager with IRCM.",
      "Emma’s approach aligns closely with Truth Care Group’s commitment to specialist brain injury rehabilitation, person-centred practice and community reintegration.",
      "Her practice is guided by integrity, respect, kindness and optimism. She takes pride in seeing each person not simply as a patient, but as their true self, supporting them to build a life that feels meaningful, connected and achievable.",
    ].join("\n\n"),
    image: "team-emma-merriman",
  },
];
