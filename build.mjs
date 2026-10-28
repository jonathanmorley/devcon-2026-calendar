// Converts the Sessionize schedule for AI DevCon NYC 2026 into an iCalendar feed.
// Usage: node build.mjs  (writes devcon-2026.ics)
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const EVENT_ID = "dcbso6w5";
const SOURCE = `https://sessionize.com/api/v2/${EVENT_ID}/view/GridSmart`;
const TZ = "America/New_York";
const OUT = "devcon-2026.ics";

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso) => iso.replace(/[-:]/g, "").slice(0, 15); // 2026-11-02T10:00:00 -> 20261102T100000
// RFC 5545 line folding: max 75 octets per line, continuation lines start with a space.
const fold = (line) => {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    let end = Math.min(i + (out.length ? 74 : 75), bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--; // don't split a UTF-8 sequence
    out.push((out.length ? " " : "") + bytes.subarray(i, end).toString("utf8"));
    i = end;
  }
  return out.join("\r\n");
};

export function toIcs(days) {
  const seen = new Set();
  const events = [];
  for (const day of days) {
    for (const room of day.rooms) {
      for (const s of room.sessions) {
        if (s.isServiceSession && !s.isPlenumSession) continue; // skip per-room filler like "Welcome" placeholders
        const key = `${s.title.trim()}|${s.startsAt}`;
        if (s.isPlenumSession && seen.has(key)) continue; // plenum sessions are listed once per room
        seen.add(key);
        const items = (n) => (s.categories.find((c) => c.name === n)?.categoryItems ?? []).map((i) => i.name).join(", ");
        const desc = [
          s.speakers.length ? `Speakers: ${s.speakers.map((p) => p.name).join(", ")}` : "",
          [items("Session Type"), items("Primary Track")].filter(Boolean).join(" · "),
          items("Level") ? `Level: ${items("Level")}` : "",
          items("Virtual session") ? "Livestreamed for virtual attendees" : "",
          s.description ?? "",
        ].filter(Boolean).join("\n\n");
        events.push([
          "BEGIN:VEVENT",
          `UID:${s.id}@sessionize-${EVENT_ID}`,
          `DTSTAMP:${stamp(s.startsAt)}Z`, // deterministic so the file only changes when the schedule does
          `DTSTART;TZID=${TZ}:${stamp(s.startsAt)}`,
          `DTEND;TZID=${TZ}:${stamp(s.endsAt)}`,
          `SUMMARY:${esc(s.title.trim())}`,
          `LOCATION:${esc(`${(s.isPlenumSession ? "All rooms" : room.name.trim())}, Industry City Building 5, Brooklyn`)}`,
          desc ? `DESCRIPTION:${esc(desc)}` : "",
          "URL:https://tessl.io/devcon#agenda",
          "END:VEVENT",
        ].filter(Boolean));
      }
    }
  }
  assert.ok(events.length > 0, "no sessions found");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jonathanmorley//devcon-2026-calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AI DevCon NYC 2026",
    `X-WR-TIMEZONE:${TZ}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "BEGIN:VTIMEZONE",
    `TZID:${TZ}`,
    "BEGIN:STANDARD",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    ...events.flat(),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Sessionize returned ${res.status}`);
  const days = await res.json();
  const ics = toIcs(days);
  assert.ok(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75), "line exceeds 75 octets");
  writeFileSync(OUT, ics);
  console.log(`wrote ${OUT}: ${(ics.match(/BEGIN:VEVENT/g) ?? []).length} events`);
}
