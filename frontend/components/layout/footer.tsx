"use client";

import Link from "next/link";

interface FooterLink {
  name: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "PRODUCT",
    links: [
      { name: "Engineering Analytics", href: "#" },
      { name: "Developer Analytics", href: "#" },
      { name: "Repository Analytics", href: "#" },
      { name: "Pull Request Analytics", href: "#" },
      { name: "Code Review Analytics", href: "#" },
    ],
  },
  {
    title: "ENGINEERING METRICS",
    links: [
      { name: "Engineering Metrics", href: "#" },
      { name: "Developer Productivity Metrics", href: "#" },
      { name: "Pull Request Metrics", href: "#" },
      { name: "PR Cycle Time", href: "#" },
      { name: "Code Review Time", href: "#" },
      { name: "Software Engineering Metrics", href: "#" },
    ],
  },
  {
    title: "SOLUTIONS",
    links: [
      { name: "For Engineering Managers", href: "#" },
      { name: "For CTOs", href: "#" },
      { name: "For Engineering Leaders", href: "#" },
      { name: "For Development Teams", href: "#" },
    ],
  },
  {
    title: "PLATFORMS",
    links: [
      { name: "GitHub", href: "https://github.com" },
      { name: "GitHub Audit", href: "/github-audit" },
      { name: "GitHub Analytics", href: "/github-analytics" },
      { name: "GitLab", href: "https://gitlab.com" },
      { name: "GitLab Audit", href: "#" },
      { name: "GitLab Analytics", href: "#" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { name: "Engineering Productivity", href: "#" },
      { name: "Developer Productivity", href: "#" },
      { name: "Code Review Analytics", href: "#" },
      { name: "Blog", href: "#" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { name: "About", href: "#" },
      { name: "Contact", href: "#" },
      { name: "Pricing", href: "#" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800/80 text-slate-300 text-sm">
      {/* Main Footer Container */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-8 lg:gap-6">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-3.5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-xs text-slate-400 hover:text-white hover:underline transition-colors duration-150"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Copyright Row */}
        <div className="mt-16 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} GitAudit Platform Inc. All rights reserved.</p>
          <p className="text-slate-500">
            Built for engineering teams with GitHub & GitLab integration.
          </p>
        </div>
      </div>
    </footer>
  );
}
