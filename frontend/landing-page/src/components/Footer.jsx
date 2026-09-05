import { Link } from "react-router-dom";
import {
  FaXTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaFacebookF,
} from "react-icons/fa6";
import Brand from "./Brand.jsx";

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Get Started", href: "/signup" },
];

const supportLinks = [
  { label: "Contact", href: "mailto:infodannbusiness@gmail.com" },
  { label: "FAQ & Help", href: "#faq" },
  { label: "Sign In", href: "/login" },
];

const socials = [
  { label: "X", href: "https://x.com/@dannbusiness26", icon: FaXTwitter },
  { label: "Instagram", href: "https://instagram.com/dannb.usiness", icon: FaInstagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/dannbusiness/", icon: FaLinkedinIn },
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61593587796210", icon: FaFacebookF },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-paper-light">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Production, inventory, orders, and profit in one place for
              small manufacturers.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="text-ink-muted transition-colors hover:text-ink"
                  >
                    <Icon size={16} aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-ink">Product</h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("#") ? (
                    <a href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-ink">Support</h3>
            <ul className="mt-4 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("mailto:") || link.href.startsWith("#") ? (
                    <a href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-border pt-6">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} DANN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
