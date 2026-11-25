import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// All user-facing dates are DD/MM/YYYY, rendered in IST so server- and
// client-rendered output match regardless of the host/browser locale.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
})

type DateInput = Date | string | number | null | undefined

function toValidDate(val: DateInput): Date | null {
  if (val === null || val === undefined || val === "") return null
  const d = val instanceof Date ? val : new Date(val)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Formats a date as DD/MM/YYYY. Returns "-" for empty/invalid input. */
export function formatDate(val: DateInput): string {
  const d = toValidDate(val)
  return d ? DATE_FORMATTER.format(d) : "-"
}

/** Formats a date-time as DD/MM/YYYY, hh:mm am/pm. Returns "-" for empty/invalid input. */
export function formatDateTime(val: DateInput): string {
  const d = toValidDate(val)
  return d ? DATE_TIME_FORMATTER.format(d) : "-"
}

/**
 * A date as an ISO `YYYY-MM-DD` string using its *local* calendar day.
 * (Unlike `d.toISOString().split("T")[0]`, which is the UTC day and shifts
 * back a day in IST for local-midnight dates or before 05:30.)
 */
export function toLocalISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today's date as a local ISO `YYYY-MM-DD` string. */
export function todayISO(): string {
  return toLocalISODate(new Date())
}
