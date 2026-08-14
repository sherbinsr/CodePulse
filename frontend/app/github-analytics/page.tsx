import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/footer";
import GitHubAnalyticsClient from "./github-analytics-client";

export const metadata: Metadata = {
  title: "GitHub Analytics – Engineering, Repository & Developer Insights",
  description:
    "Analyze GitHub repositories, pull requests, code reviews, developer activity and engineering metrics with powerful GitHub analytics dashboards.",
  keywords: [
    "GitHub Analytics",
    "GitHub analytics tool",
    "GitHub repository analytics",
    "GitHub developer analytics",
    "GitHub engineering analytics",
    "GitHub PR analytics",
    "GitHub team analytics",
    "GitHub productivity analytics",
    "GitHub metrics",
  ],
  alternates: {
    canonical: "/github-analytics",
  },
  openGraph: {
    title: "GitHub Analytics – Engineering, Repository & Developer Insights",
    description:
      "Analyze GitHub repositories, pull requests, code reviews, developer activity and engineering metrics with powerful GitHub analytics dashboards.",
    url: "/github-analytics",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Analytics – Engineering, Repository & Developer Insights",
    description:
      "Analyze GitHub repositories, pull requests, code reviews, developer activity and engineering metrics with powerful GitHub analytics dashboards.",
  },
};

export default function GitHubAnalyticsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "GitAudit GitHub Analytics",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web",
        "description":
          "Analyze GitHub repositories, pull requests, code reviews, developer activity and engineering metrics with powerful GitHub analytics dashboards.",
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
            "name": "What is GitHub Analytics?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "GitHub Analytics is the process of analyzing GitHub development data to understand repositories, pull requests, code reviews, developer activity, team collaboration, and engineering trends.",
            },
          },
          {
            "@type": "Question",
            "name": "What can GitHub Analytics track?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "GitHub analytics can track repository activity, commits, pull requests, code reviews, contributors, merges, development trends, and engineering metrics.",
            },
          },
          {
            "@type": "Question",
            "name": "What is a GitHub analytics tool?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "A GitHub analytics tool collects and analyzes GitHub activity and presents it through dashboards, reports, metrics, and visualizations.",
            },
          },
          {
            "@type": "Question",
            "name": "Can GitHub Analytics analyze multiple repositories?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. A GitHub analytics platform can provide centralized insights across multiple repositories and teams.",
            },
          },
          {
            "@type": "Question",
            "name": "Can GitHub Analytics measure developer productivity?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "GitHub activity can provide useful signals about development workflows and collaboration. However, individual developer activity should not be treated as a simple or definitive measure of productivity.",
            },
          },
          {
            "@type": "Question",
            "name": "What is the difference between GitHub Analytics and GitHub Audit?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "GitHub Analytics focuses primarily on metrics, dashboards, trends, and engineering insights. GitHub Audit focuses more broadly on assessing repositories, identifying potential bottlenecks, and understanding overall engineering health.",
            },
          },
          {
            "@type": "Question",
            "name": "Is GitHub Analytics useful for engineering managers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. Engineering managers can use GitHub analytics to understand team activity, PR performance, code review workflows, repository activity, and development trends.",
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
      <GitHubAnalyticsClient />
      <Footer />
    </>
  );
}
