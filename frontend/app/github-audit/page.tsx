import type { Metadata } from "next";
import Footer from "@/components/layout/footer";
import GitHubAuditClient from "./github-audit-client";

export const metadata: Metadata = {
  title: "GitHub Audit Tool – Analyze Repositories & Engineering Performance",
  description:
    "Audit your GitHub repositories with actionable insights into pull requests, code reviews, developer activity, repository health, and engineering performance.",
  keywords: [
    "GitHub Audit Tool",
    "GitHub audit",
    "GitHub repository audit",
    "GitHub analytics",
    "GitHub code review analytics",
    "GitHub PR analytics",
    "GitHub repository analysis",
    "GitHub developer analytics",
    "GitHub engineering metrics",
    "engineering performance audit",
  ],
  alternates: {
    canonical: "/github-audit",
  },
  openGraph: {
    title: "GitHub Audit Tool – Analyze Repositories & Engineering Performance",
    description:
      "Audit your GitHub repositories with actionable insights into pull requests, code reviews, developer activity, repository health, and engineering performance.",
    url: "/github-audit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Audit Tool – Analyze Repositories & Engineering Performance",
    description:
      "Audit your GitHub repositories with actionable insights into pull requests, code reviews, developer activity, repository health, and engineering performance.",
  },
};

export default function GitHubAuditPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "GitAudit GitHub Audit Tool",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web",
        "description":
          "Audit your GitHub repositories with actionable insights into pull requests, code reviews, developer activity, repository health, and engineering performance.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is a GitHub audit?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "A GitHub audit is an analysis of GitHub repositories, pull requests, code reviews, developer activity, and other development data to understand repository health and engineering performance.",
            },
          },
          {
            "@type": "Question",
            "name": "What does a GitHub audit tool analyze?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "A GitHub audit tool can analyze repositories, pull requests, commits, code reviews, contributors, merge activity, and engineering metrics.",
            },
          },
          {
            "@type": "Question",
            "name": "Why should I audit my GitHub repositories?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Auditing GitHub repositories can help identify development bottlenecks, review delays, repository activity patterns, and opportunities to improve engineering workflows.",
            },
          },
          {
            "@type": "Question",
            "name": "Can GitHub Audit analyze multiple repositories?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. GitHub Audit is designed to provide visibility across multiple repositories so teams can understand development activity at both repository and organizational levels.",
            },
          },
          {
            "@type": "Question",
            "name": "Can GitHub Audit help measure developer productivity?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "GitHub activity can provide useful engineering signals such as pull request activity, review activity, and contribution patterns. These metrics should be interpreted as indicators of engineering workflows rather than as a simplistic measure of individual developer performance.",
            },
          },
          {
            "@type": "Question",
            "name": "Is GitHub Audit useful for engineering managers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. Engineering managers can use GitHub analytics to understand team activity, pull request performance, review workflows, and development trends.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GitHubAuditClient />
      <Footer />
    </>
  );
}
