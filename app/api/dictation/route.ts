/**
 * POST /api/dictation
 * Forwards the uploaded audio Blob to OpenAI Whisper (`whisper-1`) and returns
 * the transcript. Language is auto-detected (no `language` field is sent), so
 * English and Italian both work without any client-side configuration.
 *
 * Request: multipart/form-data with field `audio` (Blob/File).
 * Response: 200 `{ transcript: string }` | 400/502 `{ error: string }`.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_TRANSCRIPTIONS_URL =
  "https://api.openai.com/v1/audio/transcriptions";

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[/api/dictation] OPENAI_API_KEY is not set");
    return NextResponse.json(
      {
        error:
          "OpenAI is not configured. Set OPENAI_API_KEY in Vercel (Production / Preview) and redeploy.",
      },
      { status: 503 },
    );
  }

  let inboundForm: FormData;
  try {
    inboundForm = await request.formData();
  } catch (err) {
    console.error("[/api/dictation] Failed to parse multipart body:", err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 400 },
    );
  }

  const audio = inboundForm.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 400 },
    );
  }

  const filename =
    audio instanceof File && audio.name ? audio.name : "audio.webm";

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, filename);
  upstreamForm.append("model", "whisper-1");

  try {
    const upstream = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(
        "[/api/dictation] OpenAI Whisper non-OK:",
        upstream.status,
        detail,
      );
      const userMsg =
        upstream.status === 401
          ? "OpenAI rejected the API key. Update OPENAI_API_KEY in Vercel and redeploy."
          : upstream.status === 429
            ? "OpenAI rate limit. Try again in a moment."
            : "Transcription failed. Check Vercel logs for the OpenAI response.";
      return NextResponse.json({ error: userMsg }, { status: 502 });
    }

    const data = (await upstream.json()) as { text?: string };
    const transcript = (data.text ?? "").trim();
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[/api/dictation] OpenAI Whisper request failed:", err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 502 },
    );
  }
}
