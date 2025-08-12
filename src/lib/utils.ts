import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize a single time like "9", "9h", "9:3", "0930" -> "09:00" / "09:30"
export function normalizeHour(value: string): string {
  const match = String(value || "").trim().match(/(\d{1,2})(?:[:hH.]?(\d{1,2}))?/)
  if (!match) return String(value || "")
  let hh = parseInt(match[1], 10)
  let mm = match[2] ? parseInt(match[2], 10) : 0
  if (isNaN(hh)) hh = 0
  if (isNaN(mm)) mm = 0
  if (hh > 23) hh = 23
  if (mm > 59) mm = 59
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`
}

// Format ranges like "10 as 16", "9-18" -> "10:00 às 16:00"
export function formatWorkingHours(input: string): string {
  const str = String(input || "").trim()
  if (!str) return ""
  const sep = /\s*(?:às|as|a|-|até|ate|to|–|—|~)\s*/i
  const parts = str.split(sep).filter(Boolean)
  if (parts.length >= 2) {
    return `${normalizeHour(parts[0])} às ${normalizeHour(parts[1])}`
  }
  return normalizeHour(str)
}

