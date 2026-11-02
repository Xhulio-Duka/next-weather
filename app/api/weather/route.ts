import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get("location")?.trim()
  const apiKey = process.env.VISUAL_CROSSING_API_KEY

  if (!location) return NextResponse.json({ error: "Enter a location to continue." }, { status: 400 })
  if (!apiKey) return NextResponse.json({ error: "Weather service is not configured." }, { status: 500 })

  const params = new URLSearchParams({
    unitGroup: "us",
    include: "hours,current,days",
    elements: "datetime,datetimeEpoch,temp,tempmax,tempmin,feelslike,humidity,precipprob,precip,windspeed,conditions,description,icon,sunrise,sunset",
    key: apiKey,
    contentType: "json",
  })

  try {
    const response = await fetch(`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}?${params}`, { cache: "no-store" })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const message = typeof data?.message === "string" ? data.message : "We could not find that location."
      return NextResponse.json({ error: message }, { status: response.status })
    }
    if (!data?.currentConditions || !Array.isArray(data.days)) {
      return NextResponse.json({ error: "Weather data was incomplete." }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Weather service is unavailable." }, { status: 502 })
  }
}
