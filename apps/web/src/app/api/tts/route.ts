import { NextResponse } from "next/server";

const ELEVENLABS_MODEL = "eleven_flash_v2_5";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const text = body?.text as string | undefined;
  const voiceId = body?.voiceId as string | undefined;

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (!voiceId?.trim()) {
    return NextResponse.json({ error: "voiceId is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[TTS] ElevenLabs error ${res.status}:`, detail);
    return NextResponse.json(
      { error: "TTS generation failed", detail },
      { status: res.status },
    );
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
