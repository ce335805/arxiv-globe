"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname(); // Get the current route

    return (
        <nav className="bg-gray-800 text-white p-4">
            <ul className="flex space-x-4">
                <li>
                    <Link
                        href="/"
                        className={`${
                            pathname === "/" ? "text-yellow-400" : "hover:text-gray-300"
                        }`}
                    >
                        Home
                    </Link>
                </li>
                <li>
                    <Link
                        href="/about"
                        className={`${
                            pathname === "/about" ? "text-yellow-400" : "hover:text-gray-300"
                        }`}
                    >
                        About
                    </Link>
                </li>
            </ul>
        </nav>
    );
}
