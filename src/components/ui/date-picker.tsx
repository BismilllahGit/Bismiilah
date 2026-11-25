"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { cn, todayISO } from "@/lib/utils"

/**
 * DD/MM/YYYY date picker used in place of the native `<input type="date">`,
 * whose display format follows the browser locale and can't be controlled.
 *
 * Values in and out are ISO `YYYY-MM-DD` strings (the same contract as the
 * native date input), so form submissions and API payloads are unchanged.
 * When `name` is set, a hidden input carries the ISO value for FormData.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

type YMD = { y: number; m: number; d: number } // m is 1-12

const pad = (n: number, len = 2) => String(n).padStart(len, "0")
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
const toISO = ({ y, m, d }: YMD) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`
const toDisplay = ({ y, m, d }: YMD) => `${pad(d)}/${pad(m)}/${pad(y, 4)}`

function isValidYMD(y: number, m: number, d: number) {
  return y >= 1000 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

function parseISO(value: string | undefined | null): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "")
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return isValidYMD(y, m, d) ? { y, m, d } : null
}

/** Parses "DD/MM/YYYY" (also accepts "-" or "." separators). */
function parseDisplay(text: string): YMD | null {
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text.trim())
  if (!match) return null
  const [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return isValidYMD(y, m, d) ? { y, m, d } : null
}

/** Re-inserts slashes as the user types digits: "2511" -> "25/11". */
function maskDigits(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  let out = digits.slice(0, 2)
  if (digits.length > 2) out += "/" + digits.slice(2, 4)
  if (digits.length > 4) out += "/" + digits.slice(4, 8)
  return out
}

function isoToDisplay(value: string | undefined | null) {
  const ymd = parseISO(value)
  return ymd ? toDisplay(ymd) : ""
}

export type DatePickerProps = {
  /** Controlled ISO value (YYYY-MM-DD), "" for empty. */
  value?: string
  /** Uncontrolled initial ISO value. */
  defaultValue?: string
  /** Called with the ISO value ("" when cleared) whenever a valid date is picked or typed. */
  onValueChange?: (value: string) => void
  name?: string
  id?: string
  required?: boolean
  disabled?: boolean
  /** ISO lower bound (inclusive). */
  min?: string
  /** ISO upper bound (inclusive). */
  max?: string
  placeholder?: string
  className?: string
  "aria-label"?: string
}

function DatePicker({
  value: controlledValue,
  defaultValue,
  onValueChange,
  name,
  id,
  required,
  disabled,
  min,
  max,
  placeholder = "DD/MM/YYYY",
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const isControlled = controlledValue !== undefined
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  const value = isControlled ? controlledValue : uncontrolledValue

  const [text, setText] = React.useState(() => isoToDisplay(value))
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const anchorRef = React.useRef<HTMLDivElement>(null)

  // Keep the visible text in sync when the value changes from outside.
  const [syncedValue, setSyncedValue] = React.useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setText(isoToDisplay(value))
  }

  const minYMD = parseISO(min)
  const maxYMD = parseISO(max)
  const outOfRange = (iso: string) =>
    (minYMD !== null && iso < toISO(minYMD)) || (maxYMD !== null && iso > toISO(maxYMD))

  const commit = (iso: string) => {
    if (iso === value) return
    if (!isControlled) setUncontrolledValue(iso)
    setSyncedValue(iso)
    onValueChange?.(iso)
  }

  // Native constraint validation on the visible input so `required` forms
  // block submission on empty / malformed / out-of-range dates.
  const validationMessage = (() => {
    if (text === "") return required ? "Please select a date." : ""
    const ymd = parseDisplay(text)
    if (!ymd) return "Enter a valid date as DD/MM/YYYY."
    const iso = toISO(ymd)
    if (minYMD && iso < toISO(minYMD)) return `Date must be on or after ${toDisplay(minYMD)}.`
    if (maxYMD && iso > toISO(maxYMD)) return `Date must be on or before ${toDisplay(maxYMD)}.`
    return ""
  })()

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(validationMessage)
  }, [validationMessage])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = maskDigits(e.target.value)
    setText(next)
    if (next === "") {
      commit("")
      return
    }
    const ymd = parseDisplay(next)
    if (ymd && !outOfRange(toISO(ymd))) commit(toISO(ymd))
  }

  const handleTextBlur = () => {
    // Snap partially-typed / invalid text back to the last valid value.
    const ymd = parseDisplay(text)
    if (!ymd || outOfRange(toISO(ymd))) {
      if (text !== "") setText(isoToDisplay(value))
    } else {
      setText(toDisplay(ymd))
    }
  }

  const selectDay = (ymd: YMD) => {
    const iso = toISO(ymd)
    setText(toDisplay(ymd))
    commit(iso)
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <div
        ref={anchorRef}
        data-slot="date-picker"
        className={cn(
          "relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-background text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-input/50 has-[input:disabled]:opacity-50 has-[input:invalid:not(:placeholder-shown)]:border-destructive md:text-sm dark:bg-input/30",
          className
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          aria-label={ariaLabel}
          required={required}
          disabled={disabled}
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          className="h-full w-full min-w-0 flex-1 rounded-lg bg-transparent pr-9 pl-2.5 tabular-nums outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <PopoverPrimitive.Trigger
          disabled={disabled}
          aria-label="Open calendar"
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-0.5 size-7 text-muted-foreground"
            />
          }
        >
          <CalendarIcon />
        </PopoverPrimitive.Trigger>
        {name && <input type="hidden" name={name} value={value} />}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchorRef}
          side="bottom"
          align="start"
          sideOffset={4}
          className="isolate z-50 outline-none"
        >
          <PopoverPrimitive.Popup
            data-slot="date-picker-content"
            className="z-50 origin-(--transform-origin) rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <Calendar
              selected={parseISO(value)}
              min={minYMD}
              max={maxYMD}
              onSelect={selectDay}
              onClear={
                required
                  ? undefined
                  : () => {
                      setText("")
                      commit("")
                      setOpen(false)
                    }
              }
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function Calendar({
  selected,
  min,
  max,
  onSelect,
  onClear,
}: {
  selected: YMD | null
  min: YMD | null
  max: YMD | null
  onSelect: (ymd: YMD) => void
  onClear?: () => void
}) {
  const today = parseISO(todayISO())!
  const initial = selected ?? today
  const [view, setView] = React.useState({ y: initial.y, m: initial.m })

  const shiftMonth = (delta: number) => {
    setView(({ y, m }) => {
      const idx = y * 12 + (m - 1) + delta
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }
    })
  }

  const minISO = min ? toISO(min) : null
  const maxISO = max ? toISO(max) : null
  const isDisabled = (ymd: YMD) => {
    const iso = toISO(ymd)
    return (minISO !== null && iso < minISO) || (maxISO !== null && iso > maxISO)
  }

  // Monday-first grid.
  const leading = (new Date(view.y, view.m - 1, 1).getDay() + 6) % 7
  const total = daysInMonth(view.y, view.m)
  const cells: (YMD | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, i) => ({ y: view.y, m: view.m, d: i + 1 })),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const sameDay = (a: YMD | null, b: YMD | null) =>
    !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d

  const yearOptions: number[] = []
  const startYear = Math.min(min?.y ?? today.y - 10, view.y)
  const endYear = Math.max(max?.y ?? today.y + 10, view.y)
  for (let y = startYear; y <= endYear; y++) yearOptions.push(y)

  const selectCls = "h-7 rounded-md py-0 pr-7 pl-2 text-sm font-medium shadow-none"
  const selectIconCls = "right-2 size-3.5"

  return (
    <div className="w-[16.5rem]">
      <div className="flex items-center justify-between gap-1.5">
        <Button type="button" variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          <ChevronLeftIcon />
        </Button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <NativeSelect
            aria-label="Month"
            wrapperClassName="w-auto"
            className={selectCls}
            iconClassName={selectIconCls}
            value={view.m}
            onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
          >
            {MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label.slice(0, 3)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Year"
            wrapperClassName="w-auto"
            className={selectCls}
            iconClassName={selectIconCls}
            value={view.y}
            onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="button" variant="outline" size="icon-sm" aria-label="Next month" onClick={() => shiftMonth(1)}>
          <ChevronRightIcon />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[0.8rem] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="flex h-8 items-center justify-center">
            {w}
          </div>
        ))}
      </div>
      <div role="grid" className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />
          const isSelected = sameDay(cell, selected)
          const isToday = sameDay(cell, today)
          return (
            <Button
              key={i}
              type="button"
              variant="ghost"
              size="icon"
              disabled={isDisabled(cell)}
              aria-label={toDisplay(cell)}
              aria-pressed={isSelected}
              onClick={() => onSelect(cell)}
              className={cn(
                "mx-auto font-normal tabular-nums disabled:opacity-30",
                isToday && !isSelected && "bg-muted font-semibold",
                isSelected && "bg-primary font-medium text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
              )}
            >
              {cell.d}
            </Button>
          )
        })}
      </div>

      <div className="-mx-3 mt-3 flex items-center justify-between border-t px-3 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled(today)}
          onClick={() => onSelect(today)}
        >
          Today
        </Button>
        {onClear && (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

export { DatePicker }
