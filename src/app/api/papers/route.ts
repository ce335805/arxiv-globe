import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "cs.AI";
  const index = searchParams.get("index") || "0";

  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;

  if (!backendUrl || !apiKey) {
    console.error("Missing BACKEND_URL or BACKEND_API_KEY environment variable");
    return NextResponse.json(
      { error: "Backend configuration missing" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${backendUrl}/papers/by-category?category=${category}&index=${index}`,
      {
        headers: {
          "X-API-Key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json(
        { error: errorData.detail || `HTTP error! status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching from backend:", error);
    return NextResponse.json(
      { error: "Failed to fetch paper from backend" },
      { status: 500 }
    );
  }
}
