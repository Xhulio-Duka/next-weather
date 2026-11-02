"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, Droplets, LocateFixed, MapPin, Moon, RefreshCw, Search, Snowflake, Sun, Sunrise, Sunset, Wind, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

type Hour = {
  datetimeEpoch: number
  temp: number
  precipprob: number
  icon?: string
}

type Day = {
  datetime: string
  tempmax: number
  tempmin: number
  icon?: string
  sunrise?: string
  sunset?: string
  hours?: Hour[]
}

type Current = {
  temp: number
  feelslike: number
  humidity: number
  precipprob: number
  windspeed: number
  conditions: string
  icon?: string
}

type Weather = {
  address: string
  resolvedAddress?: string
  timezone: string
  currentConditions: Current
  days: Day[]
}

const iconFor = (icon = ""): LucideIcon => {
  const name = icon.toLowerCase()
  if (name.includes("thunder") || name.includes("lightning") || name.includes("storm")) return CloudLightning
  if (name.includes("snow") || name.includes("sleet") || name.includes("ice")) return Snowflake
  if (name.includes("rain") || name.includes("shower") || name.includes("drizzle")) return CloudRain
  if (name.includes("fog") || name.includes("mist") || name.includes("haze")) return CloudFog
  if (name.includes("partly")) return name.includes("night") ? CloudMoon : CloudSun
  if (name.includes("wind")) return Wind
  if (name.includes("cloud") || name.includes("overcast")) return Cloud
  if (name.includes("night")) return Moon
  return Sun
}

const formatClock = (time?: string) => {
  if (!time) return "—"
  const [hour = "", minute = ""] = time.split(":")
  const hours = Number(hour)
  const minutes = Number(minute)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "—"
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)))
}

const formatHour = (epoch: number, timeZone: string) => {
  const date = new Date(epoch * 1000)
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone }).format(date)
  } catch {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date)
  }
}

const formatDay = (value: string, index: number) => {
  if (index === 0) return "Today"
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)))
}

const round = (value: number | null | undefined) => (Number.isFinite(value) ? Math.round(value as number) : "—")

export default function Page() {
  const [location, setLocation] = useState("")
  const [query, setQuery] = useState("")
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const loadWeather = useCallback(async (place: string) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/weather?location=${encodeURIComponent(place)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Unable to load weather.")
      const placeName = data.resolvedAddress || data.address || place
      setWeather(data)
      setLocation(placeName)
      setQuery(placeName)
      window.localStorage.setItem("nextweather-location", placeName)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load weather.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const savedLocation = window.localStorage.getItem("nextweather-location")
    if (savedLocation) {
      loadWeather(savedLocation)
      return
    }

    if (!navigator.geolocation) {
      loadWeather("Seattle, WA")
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => loadWeather(`${coords.latitude},${coords.longitude}`),
      () => loadWeather("Seattle, WA"),
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }, [loadWeather])

  const current = weather?.currentConditions
  const today = weather?.days?.[0]
  const hourly = useMemo(() => {
    if (!weather?.days) return { hours: [] as Hour[], nowIndex: -1 }
    const now = Date.now() / 1000
    const hours = weather.days
      .flatMap((day) => day.hours ?? [])
      .filter((hour) => hour.datetimeEpoch >= now - 12 * 3600 && hour.datetimeEpoch <= now + 12 * 3600)
      .slice(0, 25)
    let nowIndex = -1
    let closest = Number.POSITIVE_INFINITY
    hours.forEach((hour, index) => {
      const diff = Math.abs(hour.datetimeEpoch - now)
      if (diff < closest) {
        closest = diff
        nowIndex = index
      }
    })
    return { hours, nowIndex }
  }, [weather])
  const CurrentIcon = iconFor(current?.icon)
  const timeZone = weather?.timezone || "UTC"

  return <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><CloudSun /></div><div><p className="text-xl font-semibold tracking-tight">NextWeather</p><p className="text-xs text-muted-foreground">Simple forecasts, beautifully clear</p></div></div>
        <Button variant="outline" size="sm" onClick={() => loadWeather(location || query || "Seattle, WA")} disabled={loading}><RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : ""} /> Refresh</Button>
      </header>

      <nav aria-label="Popular cities" className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {(["Tokyo", "New York", "Rome", "Beijing", "Helsinki"] as const).map((city) => (
          <Button
            key={city}
            type="button"
            size="sm"
            variant={location.toLowerCase().includes(city.toLowerCase()) ? "default" : "outline"}
            className="shrink-0 rounded-full"
            onClick={() => loadWeather(city)}
            disabled={loading}
          >
            {city}
          </Button>
        ))}
      </nav>

      <section className="mb-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
        <div><Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">Live local forecast</Badge><h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">A clearer view of <span className="text-primary">what&apos;s ahead.</span></h1><p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Get the conditions you need, from the next hour to the next week.</p></div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (query.trim()) loadWeather(query.trim()) }}><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Location" value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 rounded-xl pl-10" placeholder="City, state or country" /></div><Button className="h-12 rounded-xl px-5" type="submit">Search</Button></form>
      </section>

      {error && <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle />{error}</div>}
      {loading && !weather ? <div className="grid gap-6 md:grid-cols-3"><Skeleton className="h-64 rounded-2xl md:col-span-2" /><Skeleton className="h-64 rounded-2xl" /></div> : weather && current && today ? <>
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="overflow-hidden rounded-3xl border-0 bg-primary text-primary-foreground shadow-xl md:col-span-2"><CardContent className="relative p-7 sm:p-10"><div className="absolute -right-8 -top-10 size-48 rounded-full bg-primary-foreground/10" /><div className="relative flex flex-col justify-between gap-8 sm:flex-row"><div><div className="flex items-center gap-2 text-sm opacity-80"><MapPin /> {weather.address}</div><p className="mt-8 text-8xl font-semibold tracking-tighter">{round(current.temp)}°F</p><p className="mt-2 text-lg font-medium">{current.conditions}</p><p className="mt-1 text-sm opacity-75">Feels like {round(current.feelslike)}°F</p></div><CurrentIcon className="size-28 stroke-[1.2] opacity-90 sm:mt-8" /></div><div className="relative mt-10 grid grid-cols-3 gap-3 border-t border-primary-foreground/20 pt-5 text-sm"><div><p className="opacity-65">Humidity</p><p className="mt-1 font-medium">{round(current.humidity)}%</p></div><div><p className="opacity-65">Wind</p><p className="mt-1 font-medium">{round(current.windspeed)} mph</p></div><div><p className="opacity-65">Rain chance</p><p className="mt-1 font-medium">{round(current.precipprob)}%</p></div></div></CardContent></Card>
          <Card className="rounded-3xl"><CardHeader><CardTitle className="text-base">Today&apos;s details</CardTitle></CardHeader><CardContent className="flex flex-col gap-5"><Detail icon={Wind} label="Wind speed" value={`${round(current.windspeed)} mph`} /><Detail icon={Droplets} label="Rain likelihood" value={`${round(current.precipprob)}%`} /><Detail icon={Sunrise} label="Sunrise" value={formatClock(today.sunrise)} /><Detail icon={Sunset} label="Sunset" value={formatClock(today.sunset)} /></CardContent></Card>
        </section>

        <section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-medium text-primary">Local time</p><h2 className="text-2xl font-semibold tracking-tight">Around the clock</h2></div><p className="text-sm text-muted-foreground">Past and next 12 hours</p></div><div className="flex gap-3 overflow-x-auto pb-3">{hourly.hours.map((hour, index) => { const Icon = iconFor(hour.icon); const isNow = index === hourly.nowIndex; return <Card key={`${hour.datetimeEpoch}-${index}`} className={`min-w-24 rounded-2xl ${isNow ? "border-primary bg-primary/5" : ""}`}><CardContent className="flex flex-col items-center gap-3 p-4"><span className="text-xs text-muted-foreground">{isNow ? "Now" : formatHour(hour.datetimeEpoch, timeZone)}</span><Icon className="size-6 text-primary" /><span className="font-semibold">{round(hour.temp)}°F</span><span className="text-[11px] text-muted-foreground">{round(hour.precipprob)}% rain</span></CardContent></Card> })}</div></section>
        <section className="mt-8"><h2 className="mb-4 text-2xl font-semibold tracking-tight">7-day outlook</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{weather.days.slice(0, 7).map((day, index) => { const Icon = iconFor(day.icon); return <Card key={day.datetime} className="rounded-2xl"><CardContent className="flex items-center justify-between p-4 lg:flex-col lg:items-start lg:gap-4"><span className="text-sm font-medium">{formatDay(day.datetime, index)}</span><Icon className="size-6 text-primary" /><div className="text-right lg:text-left"><span className="font-semibold">{round(day.tempmax)}°F</span><span className="ml-2 text-sm text-muted-foreground">{round(day.tempmin)}°F</span></div></CardContent></Card> })}</div></section>
      </> : null}
      <footer className="mt-12 flex items-center justify-between gap-4 border-t pt-5 text-xs text-muted-foreground"><span>Data by Visual Crossing</span><span className="flex min-w-0 items-center gap-1"><LocateFixed className="shrink-0" /><span className="truncate">{weather?.address || "Search a place to begin"}</span></span></footer>
    </div>
  </main>
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div></div> }
