import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://codepulse.dev"),
  title: {
    default: "CodePulse — Engineering Analytics",
    template: "%s | CodePulse",
  },
  description:
    "PR analytics and engineering productivity platform for GitHub teams. Track pull requests, review times, CI pipelines, and developer performance.",
  keywords: [
    "engineering analytics",
    "PR analytics",
    "GitHub analytics",
    "code review metrics",
    "developer productivity",
    "CI/CD insights",
    "pull request dashboard",
    "engineering metrics",
    "team velocity",
    "DevOps analytics",
  ],
  authors: [{ name: "CodePulse" }],
  creator: "CodePulse",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    siteName: "CodePulse",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@codepulse",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
