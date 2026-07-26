"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/lib/site";

type Status = "idle" | "submitting" | "success" | "error";

const ENQUIRY_TYPES = [
  { value: "general", label: "General enquiry" },
  { value: "visit", label: "Arrange a visit" },
  { value: "referral", label: "Make a referral" },
] as const;

const ENQUIRY_VALUES: readonly string[] = ENQUIRY_TYPES.map((t) => t.value);

/** Fixed order so the error summary always reads top-to-bottom of the form. */
const FIELD_ORDER = ["name", "email", "message"] as const;

const SUBMIT_TIMEOUT_MS = 15_000;

const field =
  "w-full min-h-12 rounded-xl border border-navy/25 bg-paper px-4 py-3.5 text-navy " +
  "transition-colors hover:border-navy/45 focus:border-navy " +
  "aria-[invalid=true]:border-2 aria-[invalid=true]:border-orange-text";

const labelClass = "mb-1.5 block font-medium text-navy";

/* -------------------------------------------------------------- enquiry type */
/* Split out so the searchParams read can sit behind its own Suspense boundary.
   The boundary's fallback renders the *same* select with the default value, so
   the statically exported HTML always contains a complete, usable form — the
   pre-selection is a progressive enhancement, not a prerequisite. */

interface EnquirySelectProps {
  value: string;
}

function EnquirySelect({ value }: EnquirySelectProps) {
  return (
    <select id="enquiry_type" name="enquiry_type" className={field} defaultValue={value}>
      {ENQUIRY_TYPES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

function EnquirySelectFromParams() {
  const params = useSearchParams();
  const requested = params.get("type");
  // Never trust the query string: only values we actually offer are honoured,
  // anything else falls back to the default rather than producing a select
  // with no matching option.
  const value = requested && ENQUIRY_VALUES.includes(requested) ? requested : "general";
  return <EnquirySelect value={value} />;
}

/* ------------------------------------------------------------------- the form */

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Increments on every rejected submit so a second attempt with the same
  // errors still moves focus back to the summary.
  const [rejectedAttempts, setRejectedAttempts] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rejectedAttempts > 0) summaryRef.current?.focus();
  }, [rejectedAttempts]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot. The input is display:none, aria-hidden, tabIndex -1 and
    // autocomplete off, so no keyboard, pointer, screen-reader or autofill
    // path reaches it — a filled value means a bot walked the DOM. Formspree
    // also drops `_gotcha` server-side, so this is belt and braces.
    if (data.get("_gotcha")) return;

    const next: Record<string, string> = {};
    if (!String(data.get("name") ?? "").trim()) {
      next.name = "Enter your name";
    }
    const email = String(data.get("email") ?? "").trim();
    if (!email) {
      next.email = "Enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter an email address in the format name@example.com";
    }
    if (!String(data.get("message") ?? "").trim()) {
      next.message = "Tell us how we can help";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setStatus("idle");
      setRejectedAttempts((n) => n + 1);
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(SITE.formspree, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
        // Without this a stalled connection leaves the submit button disabled
        // indefinitely with no way back for the visitor.
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Formspree responded ${res.status}`);
      setStatus("success");
      form.reset();
    } catch {
      // Deliberately not surfacing the underlying error to the visitor — the
      // recovery path that matters is the phone number, shown below.
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="rounded-2xl bg-navy/[0.04] p-8 ring-1 ring-navy/10"
      >
        <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />
        <h3 className="mt-5 font-display text-[length:var(--text-h3)] font-semibold text-navy">
          Thank you — we have received your message.
        </h3>
        <p className="mt-3 leading-relaxed text-muted">
          We aim to respond within one working day. If your enquiry is urgent, please call us on{" "}
          <a
            href={`tel:${SITE.phone.replace(/\s/g, "")}`}
            className="font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:text-orange-text hover:decoration-orange-text"
          >
            {SITE.phone}
          </a>
          .
        </p>
      </div>
    );
  }

  const summaryItems = FIELD_ORDER.filter((k) => errors[k]);

  const errorMessage = (key: string) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-1.5 text-sm font-semibold text-orange-text">
        <span className="sr-only">Error: </span>
        {errors[key]}
      </p>
    ) : null;

  const describedBy = (key: string) => (errors[key] ? `${key}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {summaryItems.length > 0 && (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="mb-7 rounded-xl border-2 border-orange-text bg-orange/[0.08] px-5 py-4"
        >
          <h3 className="font-display text-lg font-semibold text-navy">
            There is a problem with this form
          </h3>
          {/* min-h-6 keeps each link a 24px target. They sit on their own
              line rather than inside a sentence, so WCAG 2.2 SC 2.5.8's
              inline exception does not cover them.

              Navy, not orange-text: #AD5A10 measures 4.94:1 on white but only
              4.13:1 once the panel's orange tint is underneath it, which fails
              AA at this size. The error is already signalled by the panel
              border and the heading, so the links do not need to carry it. */}
          <ul className="mt-2">
            {summaryItems.map((key) => (
              <li key={key}>
                <a
                  href={`#${key}`}
                  className="inline-flex min-h-6 items-center font-semibold text-navy underline decoration-navy/40 underline-offset-4 hover:decoration-navy"
                >
                  {errors[key]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
            className={field}
          />
          {errorMessage("name")}
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            className={field}
          />
          {errorMessage("email")}
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} />
        </div>

        <div>
          <label htmlFor="enquiry_type" className={labelClass}>
            Enquiry type
          </label>
          <Suspense fallback={<EnquirySelect value="general" />}>
            <EnquirySelectFromParams />
          </Suspense>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="message" className={labelClass}>
            Message
          </label>
          <p id="message-hint" className="mb-1.5 text-sm text-muted">
            Please do not include detailed medical information here. A name and a number to call
            you back on is enough to get started.
          </p>
          <textarea
            id="message"
            name="message"
            rows={6}
            required
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={
              errors.message ? "message-hint message-error" : "message-hint"
            }
            className={field}
          />
          {errorMessage("message")}
        </div>
      </div>

      {/* Same reasoning as the error summary: navy text on the tinted panel,
          with the orange border carrying the signal. */}
      {status === "error" && (
        <p
          role="alert"
          className="mt-6 rounded-xl border-2 border-orange-text bg-orange/[0.08] px-5 py-4 font-semibold text-navy"
        >
          Sorry — we could not send your message. Please try again, or call us on{" "}
          <a
            href={`tel:${SITE.phone.replace(/\s/g, "")}`}
            className="underline decoration-navy/40 underline-offset-4 hover:decoration-navy"
          >
            {SITE.phone}
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-orange px-8 py-3.5 text-base font-semibold text-navy transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>

      <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted">
        We use what you send us only to reply to your enquiry. See our{" "}
        <Link
          href="/privacy-policy"
          className="font-medium text-navy underline decoration-navy/30 underline-offset-4 hover:text-orange-text hover:decoration-orange-text"
        >
          privacy notice
        </Link>{" "}
        for how we handle it.
      </p>
    </form>
  );
}
