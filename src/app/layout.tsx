import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FTL Gym - AI-Powered Fitness Revolution",
  description: "Build your ideal body with world-class premium facilities, certified Personal Trainers, and AI-based progress tracking at FTL Gym.",
  keywords: ["Gym", "Fitness", "Personal Trainer", "AI Fitness", "Face Recognition Check-in"],
  authors: [{ name: "FTL Gym Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ftlgym.com",
    title: "FTL Gym - AI-Powered Fitness Revolution",
    description: "Build your ideal body with world-class premium facilities, certified Personal Trainers, and AI-based progress tracking at FTL Gym.",
    siteName: "FTL Gym",
  },
  twitter: {
    card: "summary_large_image",
    title: "FTL Gym - AI-Powered Fitness Revolution",
    description: "Elevate your fitness experience with premium facilities and cutting-edge AI technology.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
