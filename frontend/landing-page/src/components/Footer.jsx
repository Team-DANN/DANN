import { Link } from "react-router-dom";
import {
  FaXTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaFacebookF,
} from "react-icons/fa6";
import Brand from "./Brand.jsx";

const FOOTER_BG = "#F3F9FF";

const productLinks = [
  { label: "Pricing", href: "/pricing" },
];

const supportLinks = [
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Help Center", href: "/help-center" },
];

const socials = [
  {
    label: "X",
    href: "https://x.com/@dannbusiness26",
    icon: FaXTwitter,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/dannb.usiness",
    icon: FaInstagram,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/dannbusiness/",
    icon: FaLinkedinIn,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61593587796210",
    icon: FaFacebookF,
  },
];

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ backgroundColor: FOOTER_BG }}
    >
      {/* Soft, blurred hand-off from the section above into the footer. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-gradient-to-b from-white/15 via-[#DCEEFF]/60 to-transparent backdrop-blur-2xl sm:h-36 lg:h-44"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Brand />

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#18304D]/70">
              Production, inventory, orders, and profit in one place for small
              manufacturers.
            </p>

            <div className="mt-6 flex items-center gap-3">
              {socials.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#18304D]/15 bg-white/55 text-[#18304D]/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#18304D]/30 hover:bg-white hover:text-[#18304D]"
                  >
                    <Icon size={16} aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-[#18304D]">
              Product
            </h3>

            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-[#18304D]/70 transition-colors hover:text-[#18304D]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}

              <li>
                <Link
                  to="/download"
                  className="text-sm text-[#18304D]/70 transition-colors hover:text-[#18304D]"
                >
                  Download app
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-[#18304D]">
              Support
            </h3>

            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:infodannbusiness@gmail.com"
                  className="text-sm text-[#18304D]/70 transition-colors hover:text-[#18304D]"
                >
                  Contact
                </a>
              </li>

              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-[#18304D]/70 transition-colors hover:text-[#18304D]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#18304D]/15 pt-6 sm:flex-row">
          <p className="text-xs text-[#18304D]/55">
            © {new Date().getFullYear()} DANN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}