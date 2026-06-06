import type { Metadata } from "next";
import HomeClient from "@/components/home-client";

export const metadata: Metadata = {
  title: "CodePulse — Engineering Analytics & PR Insights",
  description:
    "Connect your GitHub organization and get instant analytics on pull requests, code reviews, developer performance, CI pipelines, and team velocity. Ship faster with CodePulse.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CodePulse — Engineering Analytics & PR Insights",
    description:
      "Real-time GitHub analytics for engineering teams. Track PR velocity, review times, contributor leaderboards, and CI health in one dashboard.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodePulse — Engineering Analytics & PR Insights",
    description:
      "Real-time GitHub analytics for engineering teams. Track PR velocity, review times, contributor leaderboards, and CI health in one dashboard.",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "CodePulse",
            applicationCategory: "DeveloperApplication",
            description:
              "Engineering analytics platform providing real-time insights on GitHub pull requests, code reviews, developer performance, CI pipelines, and team velocity.",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            featureList: [
              "PR analytics and velocity tracking",
              "Code review time metrics",
              "Developer contributor leaderboards",
              "CI/CD pipeline insights",
              "Commit activity heatmaps",
              "Team digest reports",
            ],
          }),
        }}
      />
      <HomeClient />
    </>
  );
}
