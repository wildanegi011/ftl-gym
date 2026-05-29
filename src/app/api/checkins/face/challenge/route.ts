import { NextRequest, NextResponse } from "next/server"

const CHALLENGES = [
  { type: "smile", text: "Silakan Tersenyum Lebar!" },
  { type: "blink-left", text: "Silakan Kedipkan Mata Kiri Anda!" },
  { type: "blink-right", text: "Silakan Kedipkan Mata Kanan Anda!" },
  { type: "look-aside", text: "Silakan Menoleh ke Kiri atau Kanan!" },
]

export async function GET(req: NextRequest) {
  try {
    // Pick a random challenge from the pre-defined list
    const randomIndex = Math.floor(Math.random() * CHALLENGES.length)
    const challenge = CHALLENGES[randomIndex]

    return NextResponse.json({
      success: true,
      challenge: challenge.type,
      text: challenge.text,
      timestamp: Date.now()
    })
  } catch (err: any) {
    console.error("GET liveness challenge failed:", err)
    return NextResponse.json({ error: "Gagal memuat tantangan liveness" }, { status: 500 })
  }
}
