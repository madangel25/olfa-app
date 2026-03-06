import { NextResponse } from "next/server";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

type SuggestBody = {
  type: "about_me" | "ideal_partner";
  context: {
    full_name?: string;
    age?: string;
    job_title?: string;
    country?: string;
    city?: string;
    about_me?: string;
    ideal_partner?: string;
  };
  locale?: "en" | "ar";
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Backend Check - Key Length:", apiKey?.length);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Key is missing from Vercel process.env" },
      { status: 503 }
    );
  }

  let body: SuggestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { type, context, locale = "en" } = body;
  if (!type || (type !== "about_me" && type !== "ideal_partner")) {
    return NextResponse.json({ error: "type must be 'about_me' or 'ideal_partner'." }, { status: 400 });
  }

  const lang = locale === "ar" ? "Arabic" : "English";
  const isAboutMe = type === "about_me";

  const prompt = isAboutMe
    ? `You are helping write a short, professional "About Me" bio for an Islamic marriage profile. The user's basic info: Name: ${context.full_name ?? "not given"}, Age: ${context.age ?? "not given"}, Job: ${context.job_title ?? "not given"}, Location: ${context.country ?? ""} ${context.city ?? ""}. Write a warm, sincere paragraph (2-4 sentences) that would appeal to someone seeking a serious marriage. Keep it respectful and avoid clichés. Output ONLY the bio text, no quotes or labels. Write in ${lang}.`
    : `You are helping write a short "Ideal Partner" description for an Islamic marriage profile. The user's context: ${context.about_me ? `Their about me: ${context.about_me}. ` : ""}Age: ${context.age ?? "not given"}, Job: ${context.job_title ?? "not given"}. Write a concise paragraph (2-4 sentences) describing the kind of partner they might be looking for—values, lifestyle, character—in a respectful way. Output ONLY the description text, no quotes or labels. Write in ${lang}.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Gemini API error", details: err },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "No suggestion generated." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error("Profile suggest error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI suggestion failed." },
      { status: 500 }
    );
  }
}
