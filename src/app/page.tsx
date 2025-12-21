"use client";

import Globe from "./components/Globe";
import LatexRenderer from "./components/LatexRenderer";
import { useState, useEffect } from "react";
import type { PaperData } from "./types/paper";

// Hard-coded arXiv categories organized by field
const ARXIV_CATEGORIES = [
  {
    label: "Computer Science",
    options: [
      { value: "cs.AI", label: "Artificial Intelligence" },
      { value: "cs.LG", label: "Machine Learning" },
      { value: "cs.CL", label: "Computation and Language" },
      { value: "cs.CV", label: "Computer Vision" },
      { value: "cs.CR", label: "Cryptography and Security" },
    ],
  },
  {
    label: "Physics",
    options: [
      { value: "cond-mat.str-el", label: "Strongly Correlated Electrons" },
      { value: "quant-ph", label: "Quantum Physics" },
      { value: "hep-th", label: "High Energy Physics - Theory" },
      { value: "cond-mat.mes-hall", label: "Mesoscale and Nanoscale Physics" },
      { value: "astro-ph.CO", label: "Cosmology and Nongalactic Astrophysics" },
    ],
  },
  {
    label: "Mathematics",
    options: [
      { value: "math.CO", label: "Combinatorics" },
      { value: "math.AG", label: "Algebraic Geometry" },
      { value: "math.NT", label: "Number Theory" },
      { value: "math.PR", label: "Probability" },
      { value: "math.ST", label: "Statistics Theory" },
    ],
  },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("cond-mat.str-el");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paperData, setPaperData] = useState<PaperData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch paper data
  const fetchPaper = async (category: string, index: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:8000/papers/by-category?category=${category}&index=${index}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPaperData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch paper");
      console.error("Error fetching paper:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch paper when category changes
  useEffect(() => {
    setCurrentIndex(0);
    fetchPaper(selectedCategory, 0);
  }, [selectedCategory]);

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    fetchPaper(selectedCategory, nextIndex);
  };

  return (
    <div className="flex flex-col bg-white min-h-screen max-w-screen-xl mx-auto">
      {/* Top Controls */}
      <div className="flex items-center gap-2 p-2 sm:p-3 bg-gray-900 border-b border-gray-700">
        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="flex-1 px-2 sm:px-3 py-2 bg-gray-800 text-white text-xs sm:text-sm rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          {ARXIV_CATEGORIES.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Next Button */}
        <button
          className="px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleNext}
          disabled={loading || !paperData?.metadata.has_more}
        >
          Next
        </button>
      </div>

      {/* Globe - positioned first to start at top */}
      <div className="relative w-full h-[400px] sm:h-[550px] lg:h-[650px]">
        <Globe affiliations={paperData?.affiliations} />

        {/* Title Section - absolutely positioned over the globe */}
        <div className="absolute top-0 left-0 right-0 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 z-10">
          {loading && (
            <div className="text-sm sm:text-base text-black">Loading paper...</div>
          )}

          {error && (
            <div className="text-sm sm:text-base text-black">Error: {error}</div>
          )}

          {paperData && !loading && (
            <LatexRenderer
              text={paperData.title}
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-black leading-tight"
            />
          )}
        </div>
      </div>

      {/* Additional Paper Information */}
      <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {paperData && !loading && (
          <>
            {/* Authors */}
            <div className="text-sm sm:text-base text-black">
              <span className="font-semibold">Authors: </span>
              {paperData.authors.map((author, idx) => (
                <span key={idx}>
                  {author.name}
                  {idx < paperData.authors.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>

            {/* Affiliations */}
            <div className="text-sm sm:text-base text-black">
              <div className="font-semibold mb-2">Affiliations:</div>
              {paperData.affiliations.map((affiliation, idx) => (
                <div key={idx} className="ml-3 sm:ml-4 mb-1">
                  <div>{affiliation.institution}</div>
                  <div className="text-xs sm:text-sm">
                    {affiliation.address && `${affiliation.address}, `}
                    {affiliation.country}
                  </div>
                </div>
              ))}
            </div>

            {/* Abstract */}
            <div className="text-sm sm:text-base text-black">
              <div className="font-semibold mb-2">Abstract</div>
              <LatexRenderer
                text={paperData.abstract}
                className="leading-relaxed"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
