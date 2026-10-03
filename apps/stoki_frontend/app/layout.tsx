import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import "./globals.css";


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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === "development" && (
          <script
            src="http://localhost:8400/live.js?token=a4dd85c6-5d2c-490d-99ff-f822cbea016a"
            async
          />
        )}
      </body>
    </html>

  );
}
