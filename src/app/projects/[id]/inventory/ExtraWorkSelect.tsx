"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { formatDate } from "@/lib/utils";

export type ExtraWorkOption = {
  id: string;
  voucherNumber: string;
  description: string;
  date: string;
};

function label(ew: ExtraWorkOption) {
  const desc =
    ew.description.length > 40
      ? `${ew.description.slice(0, 40)}…`
      : ew.description;
  return `${ew.voucherNumber} · ${desc} (${formatDate(ew.date)})`;
}

/**
 * Optional link from an inventory transaction to one of the project's
 * Extra Work entries. Works uncontrolled (form `name` + `defaultValue`)
 * or controlled (`value` + `onChange`).
 */
export function ExtraWorkSelect({
  extraWorks,
  name,
  defaultValue,
  value,
  onChange,
}: {
  extraWorks: ExtraWorkOption[];
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Extra Work</label>
      <NativeSelect
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      >
        <option value="">Not linked</option>
        {extraWorks.map((ew) => (
          <option key={ew.id} value={ew.id}>
            {label(ew)}
          </option>
        ))}
      </NativeSelect>
      <p className="text-[10px] text-muted-foreground">
        {extraWorks.length === 0
          ? "No extra work logged for this project yet."
          : "Link this entry to an extra work item for this project."}
      </p>
    </div>
  );
}
