import type { LegalPage } from "./types";

/**
 * The legal pages are the one place on this site where the copy is *ours*,
 * not the client's — the live site has no privacy notice at all, and a UK
 * contact form on a health service's site without one is an ICO exposure.
 *
 * Everything here is written to describe what this build actually does:
 * a static export with no cookies, no analytics and no third-party requests
 * on page load, an enquiry form posting to Formspree, and a Giraffe360
 * virtual tour behind a click-to-load facade (src/components/TourEmbed.tsx)
 * that requests nothing from Giraffe360 until the visitor presses play. If
 * the site gains analytics, a booking widget, a login, or a second embed —
 * or if the tour is ever changed to load on page view — both of these
 * documents are wrong until they are updated.
 *
 * Items still needing client sign-off are marked NEEDS CONFIRMATION in the
 * comments below and listed in the task report. They are written as
 * defensible standard positions, not invented facts.
 */

// NEEDS CONFIRMATION: item 14 — UPDATED / UPDATED_ISO are placeholder
// values set for this build, not a real publication date. Change both to
// the date this notice is actually reviewed and published before launch.
const UPDATED = "26 July 2026";
const UPDATED_ISO = "2026-07-26";

export const PRIVACY: LegalPage = {
  eyebrow: "Legal",
  heading: "Privacy notice",
  intro:
    "This notice explains what happens to the personal information you give us through this website, why we use it, and what you can ask us to do about it.",
  updated: UPDATED,
  updatedIso: UPDATED_ISO,
  sections: [
    {
      // NEEDS CONFIRMATION: item 1 — "Truth Care Group Ltd" is the exact
      // registered legal name to use as data controller; it was sourced
      // from the CQC-register comment in lib/site.ts, not confirmed by the
      // client. Also: item 2, registered company number (currently
      // omitted, should be stated); item 3, ICO data protection fee
      // registration number, or confirmation of exemption (currently
      // omitted); and item 4, whether a Data Protection Officer has been
      // appointed (a small provider is unlikely to be required to, but the
      // named responsible person should be stated).
      heading: "Who we are",
      paragraphs: [
        "Truth Care Group Ltd is the data controller for the personal information described in this notice. That means we decide why it is collected and what happens to it.",
        "You can reach us at Beaconsfield House, 11 Beaconsfield Rd, Weston-super-Mare, BS23 1YE, by email at info@truthcaregroup.co.uk, or by phone on 07483 483955. If you have a question about your information, use the same details and mark it for the attention of the registered manager.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 5 — this paragraph used to assert that a
      // separate privacy document already exists and is "given to
      // residents and their representatives when a placement begins".
      // That was never confirmed and has been rewritten below so it only
      // scopes what this web notice covers, without claiming any specific
      // document exists. If a separate care-records privacy notice does
      // exist (or is created), this section should be updated to name and
      // link it.
      heading: "What this notice covers",
      paragraphs: [
        "This notice covers truthcaregroup.co.uk only — the enquiries you send us through this website and the records our web hosting keeps.",
        "It does not cover the care records we hold about the people living at Beaconsfield House. Those are far more detailed and are held under separate rules that reflect our duties as a CQC-registered care provider. If you are a resident or a representative and would like to know more about how those records are handled, please ask us.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 16 — the server access logs sentence below
      // describes what is normal for web hosting in general, not a
      // specific commitment about this site's logs, because the hosting
      // provider is not yet fixed for this build (see item 11 below). It
      // would be wrong to state as fact what an unchosen host does, does
      // not, or shares. Once hosting is chosen, confirm what it actually
      // logs, for how long, and whether logs are shared with any
      // anti-abuse or security service, and tighten this paragraph (and
      // the retention note under "Who else handles it") to match.
      heading: "What we collect, and when",
      paragraphs: [
        "There is one form on this website: the enquiry form on our contact page. If you complete it, we receive your name, your email address, your phone number if you choose to give one, the enquiry type you selected, and whatever you write in the message box.",
        "We do not ask for health information and we ask you not to put clinical detail into the message. A name and a number to call you back on is enough for us to get started, and a phone call is a better place for the rest of the conversation than a web form.",
        "Beyond that, this website is a set of static files. There is no login, no account area and no database behind it. Whoever hosts the site, it is normal for web hosting to keep ordinary server access logs — records that can include the IP address a request came from — so that the site stays available and is protected against abuse. Whatever those logs contain, we do not use them to identify or profile visitors, and we do not combine them with anything else.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 18 — as with item 17 in the cookie policy,
      // Giraffe360's own data handling once the tour is loaded has not been
      // verified against their documentation. The paragraph below is
      // deliberately limited to what is certainly true from how the
      // click-to-load facade works (src/components/TourEmbed.tsx): loading
      // the tour connects the visitor's browser directly to Giraffe360's
      // servers, and any direct connection necessarily discloses the
      // visitor's IP address to the party at the other end. It does not
      // assert what Giraffe360 does with that address beyond that. Before
      // launch, check Giraffe360's documentation and, if there is more to
      // say about their processing, add it here to match the cookie policy.
      heading: "The virtual tour",
      paragraphs: [
        "Our virtual tour page carries a 360° tour of Beaconsfield House, made and hosted by Giraffe360, a separate company. It does not load automatically — the page shows a photograph with a play button until you choose to press it.",
        "If you do press play, your browser connects directly to Giraffe360's servers to load the tour. That connection necessarily discloses your IP address to them, in the same way any request to any website does. It happens only if you choose to load the tour; simply reading the page does not. See our cookie policy for what we know about how Giraffe360 handles this once the tour is running.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 6 — the legitimate-interests balancing
      // asserted below ("we have weighed that against your rights and are
      // satisfied it is fair") is a standard and defensible position, but
      // it is not backed by a documented Legitimate Interests Assessment;
      // one should exist before this goes live. Also item 7 — the Article
      // 9(2)(h) / DPA 2018 Sch 1 Pt 1 para 2 route below is the right one
      // for a CQC-registered provider handling health information in the
      // course of arranging care, but the client's own DPO or solicitor
      // should confirm it against their appropriate policy document.
      heading: "Why we use it, and our lawful basis",
      paragraphs: [
        "We use what you send us to reply to you: to answer a question, arrange a visit, or start the conversation about a possible referral or placement. We do not use it to send you marketing, we do not add you to a mailing list, and we never sell or rent it.",
        "Our lawful basis is Article 6(1)(f) of the UK GDPR — legitimate interests. The interest is a plain one: you have asked us something and we need to be able to answer. We have weighed that against your rights and are satisfied it is fair — you chose to contact us, we use your details only to reply, and you can object at any time.",
        "If a message does contain information about someone's health, that is special category data and needs a second basis. There we rely on Article 9(2)(h) of the UK GDPR — processing for the provision of health or social care — together with paragraph 2 of Schedule 1, Part 1 of the Data Protection Act 2018. As a CQC-registered provider we work under a professional duty of confidentiality. Where health information turns out not to be needed to answer the enquiry, we remove it.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 11 — hosting provider and mailbox provider
      // are not yet fixed for this build. Both are processors and should
      // be named here once decided. Separately, no retention period is
      // stated anywhere in this notice for server access logs (unlike the
      // enquiry retention periods below) — once a host is chosen, get the
      // log retention period from them and state it, either here or under
      // "How long we keep it".
      heading: "Who else handles it",
      listIntro:
        "We keep the list of organisations touching your enquiry as short as we can. It is currently:",
      list: [
        "Formspree (Formspree, Inc.) — receives the form submission, forwards it to our mailbox and holds a copy in our account.",
        "Our email provider — delivers and stores the message in the info@truthcaregroup.co.uk mailbox.",
        "Our web hosting provider — serves the website and keeps the server access logs described above.",
      ],
      outro: [
        "Each of these acts as our processor and may only handle your information on our instructions, under a written contract. We may also disclose information where the law requires it, or where we have a safeguarding duty to do so — for example if something you tell us suggests an adult is at risk of harm.",
      ],
    },
    {
      // NEEDS CONFIRMATION: verify Formspree's current data processing
      // agreement and transfer mechanism before launch, and sign the DPA.
      heading: "Sending information outside the UK",
      paragraphs: [
        "Formspree is based in the United States, so submitting the enquiry form transfers your details outside the UK. That transfer is made under the UK International Data Transfer Addendum to the European Commission's standard contractual clauses, which forms part of Formspree's data processing agreement, together with the technical measures Formspree applies to submissions.",
        "If you would rather your details did not leave the UK, do not use the form — email or phone us instead, using the details at the top of this notice.",
      ],
    },
    {
      // NEEDS CONFIRMATION: retention periods below are a proposed standard
      // position, not the client's existing policy. The 12-month figure and
      // the point at which an enquiry becomes part of a care record both need
      // signing off against the provider's records management schedule.
      heading: "How long we keep it",
      paragraphs: [
        "If your enquiry does not lead to a referral or a placement, we delete it — from the mailbox and from the Formspree account — within 12 months of the last time we were in touch about it. Twelve months is long enough for a family to come back to us after thinking it over, and no longer.",
        "If your enquiry does lead to a referral or a placement, it stops being a website enquiry and becomes part of the care record for that person. From that point it is kept under our records retention schedule, which follows the Records Management Code of Practice for health and social care.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 13 — "access to the enquiry mailbox and
      // the Formspree account is limited to the staff who need it" is
      // stated as fact; confirm that mailbox and Formspree account access
      // is actually restricted before this goes live. Also item 12 — "we
      // will tell the Information Commissioner's Office within 72 hours"
      // is the statutory deadline and safe to state, but assumes an
      // incident/breach-notification process actually exists to deliver
      // it; confirm one is in place.
      heading: "Keeping it safe",
      paragraphs: [
        "The whole site, including the form, is served over an encrypted connection, and the submission is encrypted in transit. Access to the enquiry mailbox and the Formspree account is limited to the staff who need it to do their job.",
        "No system is perfect. If something goes wrong and there is a risk to your rights, we will tell the Information Commissioner's Office within 72 hours and tell you directly where we are required to.",
      ],
    },
    {
      heading: "Your rights",
      listIntro: "You can ask us to:",
      list: [
        "give you a copy of the personal information we hold about you",
        "correct it, if it is wrong or incomplete",
        "delete it",
        "restrict what we do with it while a question about it is being sorted out",
        "stop using it altogether — you have a right to object, because we rely on legitimate interests",
      ],
      outro: [
        "The right to data portability does not apply to this information, because it only covers data we process with your consent or under a contract with you. We do not make automated decisions about you and we do not profile you.",
        "There is no charge for making a request, and we will respond within one month. Email info@truthcaregroup.co.uk and tell us what you want us to do. We may ask you to confirm who you are before we act, so that we are not handing someone else's information to the wrong person.",
      ],
    },
    {
      heading: "If you are not happy",
      paragraphs: [
        "Please tell us first — email info@truthcaregroup.co.uk or call 07483 483955. Most things are quicker to fix directly, and we would rather know.",
        "You also have the right to complain to the Information Commissioner's Office, the UK's data protection regulator. You can do that at ico.org.uk/make-a-complaint or on 0303 123 1113. Complaining to us first does not affect that right.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Our service is for adults. We do not knowingly collect information about children through this website. If you are enquiring on behalf of a family member, please give us only what we need to point you in the right direction.",
      ],
    },
    {
      heading: "Changes to this notice",
      paragraphs: [
        "If we change how this website handles personal information — adding analytics, an embedded map or a booking tool, for example — we will update this notice before the change goes live and move the date below. It is worth a look if you have not been here for a while.",
      ],
    },
  ],
};

export const COOKIES: LegalPage = {
  eyebrow: "Legal",
  heading: "Cookie policy",
  intro:
    "This website does not set any cookies. Not analytics, not advertising, not preferences. This page explains what that means, why you have not been asked to accept anything, and the one thing on the site — our virtual tour — that only loads if you ask it to.",
  updated: UPDATED,
  updatedIso: UPDATED_ISO,
  sections: [
    {
      heading: "The short version",
      paragraphs: [
        "Cookies are small files a website asks your browser to store so it can recognise you or your device later. We do not use them. When you load a page on truthcaregroup.co.uk, nothing is written to your browser and nothing is read from it.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 15 — "no analytics" (and the rest of this
      // list) is true of this build as shipped, but it is a statement
      // about current fact, not a permanent guarantee. It becomes false
      // the moment analytics, or any tracking, is added, and this page (and
      // the privacy notice) must be updated at that point. The virtual tour
      // is the one embed on the site and is covered separately below.
      heading: "What that means in practice",
      listIntro: "Specifically, this site has:",
      list: [
        "no analytics — no Google Analytics, no Meta pixel, no heat-mapping, no visitor counter of any kind",
        "no advertising or retargeting tags, so nothing follows you to another site after you leave",
        "nothing third-party that loads on page view — no YouTube player, no Google Map, no social feed, no chat widget, and the virtual tour stays unloaded until you press play",
        "no local storage or session storage, which are the other two places a site can leave data on your device",
        "self-hosted fonts, served from our own domain, so loading a page does not make a request to Google or anyone else",
      ],
      outro: [
        "The practical result is that opening a page here sends a request to our web server and to nowhere else.",
      ],
    },
    {
      heading: "Why there is no cookie banner",
      paragraphs: [
        "UK law — the Privacy and Electronic Communications Regulations — requires your consent before a site stores anything on your device that is not strictly necessary. We do not store anything on your device at all, so there is nothing to ask you about.",
        "Putting a consent banner on a site that sets no cookies would mean making you dismiss a box for no reason, and it would teach you to click through banners that do matter elsewhere. We would rather not do that.",
        "The virtual tour is the one thing here that could involve another company's cookies, and it is handled the way we would want it handled: it does not load at all unless you press play, so pressing play is the choice. That is described under \"The virtual tour\" below.",
      ],
    },
    {
      heading: "Sending us an enquiry",
      paragraphs: [
        "If you fill in the enquiry form on our contact page and press send, your browser makes a single request to Formspree, the service that delivers the form to our mailbox. That happens only when you submit — never on page load, and never if you simply read the page and leave.",
        "We do not set or read any cookie as part of that submission, and nothing about it is used to track you. What Formspree receives, how long it is kept and where it goes are all covered in our privacy notice.",
      ],
    },
    {
      // NEEDS CONFIRMATION: item 17 — Giraffe360's own cookie and storage
      // behaviour has NOT been verified against their documentation, their
      // cookie notice, or a real loaded tour in a clean browser profile.
      // Nothing below states what they set, only that they may set
      // something, because that is genuinely all we know. Before launch:
      // check Giraffe360's published cookie/privacy documentation, and
      // either name what a loaded tour sets and link their notice here, or
      // confirm it sets nothing and say so. Whatever the answer, the
      // click-to-load control described below is what makes this lawful
      // without a consent banner and must not be removed — the tour must
      // never be changed to load on page view without a consent mechanism
      // being built first.
      heading: "The virtual tour",
      paragraphs: [
        "Our virtual tour page carries a 360° tour of Beaconsfield House. We did not build it and we do not host it: it is made and hosted by Giraffe360, a separate company, and it plays from their computers rather than ours.",
        "So the tour does not start on its own. What you see when the page opens is a photograph of the house with a play button on it, and until you press that button your browser does not contact Giraffe360 at all. You can read the page, look through the photographs and leave again without anything of yours reaching them.",
        "If you do press play, the tour loads and your browser connects to Giraffe360 directly. From that moment they may set their own cookies or store data on your device under their own policies, and that is outside our control. It applies to that visit only — reload the page or come back later and the tour is a photograph and a button again until you choose otherwise.",
        "If you would rather not connect to them, simply do not press play. The photographs further down that page show the same rooms, and you are always welcome to come and see the house in person instead.",
      ],
    },
    {
      heading: "Controlling cookies anyway",
      paragraphs: [
        "Even though this site sets none, every major browser lets you see, block and delete cookies across all the sites you visit — usually under Settings, then Privacy. The Information Commissioner's Office publishes plain-English guidance on cookies and online tracking at ico.org.uk.",
      ],
    },
    {
      heading: "If this changes",
      paragraphs: [
        "If we ever add something that sets a cookie, we will update this page and put a consent control in place before it goes live, and we will update our privacy notice at the same time. The date below tells you when this page was last reviewed.",
      ],
    },
  ],
};
