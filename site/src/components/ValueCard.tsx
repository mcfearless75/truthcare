import { Pic } from "./Pic";
import type { ServiceValue } from "@/content/types";

/**
 * A single CQC-style service value. Sits on a warm cream field and lifts into
 * white paper on hover, with an orange rule wiping across the top edge — so the
 * hover state is designed rather than a default shadow bump.
 */
export function ValueCard({ value }: { value: ServiceValue }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-orange/[0.06] p-7 ring-1 ring-navy/10 transition duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:bg-paper hover:shadow-navy-md hover:ring-navy/15 sm:p-8">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-orange transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
      />

      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-paper ring-1 ring-navy/10 transition-colors duration-300 group-hover:ring-orange">
        <Pic imageKey={value.icon} alt="" sizes="40px" className="h-10 w-10 object-contain" />
      </span>

      <h3 className="mt-6 font-display text-[length:var(--text-h3)] font-semibold tracking-[0.06em] text-navy">
        {value.title}
      </h3>
      <p className="mt-3 leading-relaxed text-muted">{value.body}</p>
    </article>
  );
}
