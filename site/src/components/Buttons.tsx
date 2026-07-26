import Link from "next/link";

const base =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 font-semibold text-base transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 min-h-12";

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
