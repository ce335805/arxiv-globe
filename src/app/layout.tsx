import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar"; // Import the Navbar component

export const metadata: Metadata = {
    title: "My App",
    description: "Welcome to my Next.js app!",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>
        <Navbar />
        <main className="p-4">{children}</main>
        </body>
        </html>
    );
}
