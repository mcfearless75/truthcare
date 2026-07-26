import Link from "next/link";

const base =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 font-semibold text-base transition duration-200 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:shadow-navy-md active:translate-y-0 active:shadow-none min-h-12";

interface ButtonProps {
  href: string;
  label: string;
}

export function ButtonPrimary({ href, label }: ButtonProps) {
  return (
    <Link href={href} className={`${base} bg-orange text-navy hover:brightness-105`}>
      {label}
    </Link>
  );
}

export function ButtonSecondary({ href, label }: ButtonProps) {
  return (
    <Link href={href} className={`${base} border-2 border-navy text-navy hover:bg-navy hover:text-paper`}>
      {label}
    </Link>
  );
}

/**
 * Outline variant for navy / photographic backgrounds. The default global
 * focus ring (orange-text on navy) is too low-contrast on dark surfaces, so
 * this variant switches the focus outline to paper white.
 */
export function ButtonSecondaryOnDark({ href, label }: ButtonProps) {
  return (
    <Link
      href={href}
      className={`${base} border-2 border-paper/70 text-paper hover:border-paper hover:bg-paper hover:text-navy focus-visible:outline-paper!`}
    >
      {label}
    </Link>
  );
}
