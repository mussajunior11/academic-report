"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/form";

export function YearSelect({
  baseHref,
  years,
  value,
}: {
  baseHref: string;
  years: { id: string; name: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <div className="w-full sm:w-56">
      <label htmlFor="year-select" className="mb-1 block text-xs font-medium text-slate-700">
        Academic year
      </label>
      <Select
        id="year-select"
        value={value}
        onChange={(event) => router.push(`${baseHref}?yearId=${encodeURIComponent(event.target.value)}`)}
      >
        {years.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
