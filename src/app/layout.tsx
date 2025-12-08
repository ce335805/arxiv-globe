import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "arXiv Globe Visualization",
    description: "Visualize scientific collaboration on a 3D globe",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>
        <main>{children}</main>
        </body>
        </html>
    );
}
