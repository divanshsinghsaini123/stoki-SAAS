import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';


export const metadata: Metadata = {
  title: {
    default: "Stoki — Hyperlocal Q-Commerce Stock Intelligence",
    template: "%s | Stoki",
  },
  description:
    "Track your brand's availability, pricing, and dark-store presence across Blinkit, Zepto, Instamart & BigBasket in real time.",
  keywords: ["q-commerce", "inventory tracking", "dark store", "blinkit", "zepto", "FMCG", "stock intelligence"],
  authors: [{ name: "Stoki" }],
  openGraph: {
    type: "website",
    siteName: "Stoki",
    title: "Stoki — Hyperlocal Q-Commerce Stock Intelligence",
    description: "Real-time brand tracking across every pincode & dark store.",
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
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>

          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange={false}
          >
            {children}
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>

  );
}
