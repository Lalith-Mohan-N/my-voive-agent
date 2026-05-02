import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VitaVoice | AI Medical Voice Assistant",
  description:
    "Ultra-reliable voice AI assistant for high-stress, hands-busy medical environments. Real-time emergency case management with noise-adaptive clarity.",
  keywords: [
    "medical voice assistant",
    "emergency medical services",
    "AI assistant",
    "real-time dashboard",
    "voice agent",
  ],
  authors: [{ name: "VitaVoice Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen bg-[#0a0b14] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
