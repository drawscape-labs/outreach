"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxField } from "@/components/ui/checkbox";
import { Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LEAD_STATUSES } from "@/lib/statuses";

function FilterSelect({
  emptyLabel,
  label,
  name,
  onChange,
  options,
  value,
  widthClass = "sm:w-44"
}) {
  const id = `people-filter-${name}`;

  return (
    <Field className={`w-full ${widthClass}`}>
      <Label htmlFor={id}>
        {label}
      </Label>
      <Select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function statusFilterLabel(statuses) {
  if (!statuses.length) {
    return "All statuses";
  }

  if (statuses.length > 2) {
    return `${statuses.length} statuses`;
  }

  return statuses.join(", ");
}

function StatusMultiSelect({ statuses, onChange }) {
  function toggleStatus(status) {
    onChange(
      statuses.includes(status)
        ? statuses.filter((selectedStatus) => selectedStatus !== status)
        : [...statuses, status]
    );
  }

  return (
    <Field className="w-full sm:w-44">
      <Label>Status</Label>
      <div data-slot="control">
        <Popover className="relative">
          <PopoverButton as={Button} outline className="w-full justify-between font-normal">
            <span className="truncate">{statusFilterLabel(statuses)}</span>
            <svg
              className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400"
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={1.5} />
            </svg>
          </PopoverButton>
          <PopoverPanel className="absolute z-20 mt-2 w-full min-w-44 rounded-lg bg-white p-1 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
            <button
              type="button"
              className="w-full rounded-md px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-950/5 dark:text-zinc-200 dark:hover:bg-white/10"
              aria-pressed={statuses.length === 0}
              onClick={() => onChange([])}
            >
              All statuses
            </button>
            <div className="my-1 h-px bg-zinc-950/10 dark:bg-white/10" />
            <div className="space-y-1 px-3 py-1">
              {LEAD_STATUSES.map((status) => (
                <CheckboxField
                  key={status}
                  className="grid grid-cols-[1rem_1fr] gap-x-2"
                >
                  <Checkbox
                    checked={statuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  <Label className="cursor-pointer">{status}</Label>
                </CheckboxField>
              ))}
            </div>
          </PopoverPanel>
        </Popover>
      </div>
    </Field>
  );
}

export function PeopleFilters({ filters, options }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [positionQuery, setPositionQuery] = useState(filters.position);
  const positionDebounceRef = useRef(null);
  const hasFilters = Boolean(
    filters.status.length ||
      filters.email ||
      filters.linkedin ||
      filters.category ||
      filters.priority ||
      filters.position
  );

  function replaceWithParams(params) {
    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false
    });
  }

  useEffect(() => {
    return () => {
      if (positionDebounceRef.current) {
        clearTimeout(positionDebounceRef.current);
      }
    };
  }, []);

  function updateFilter(name, value) {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("page");
    params.delete("qualified");
    params.delete("industry");
    params.delete("companyIndustry");
    params.delete("company_industry");
    params.delete("positionTitle");
    params.delete("position_title");

    if (name === "category") {
      params.delete("companyCategory");
      params.delete("company_category");
    }

    if (name === "priority") {
      params.delete("companyPriority");
      params.delete("company_priority");
    }

    if (name === "linkedin") {
      params.delete("linkedinProfile");
      params.delete("linkedin_profile");
    }

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    replaceWithParams(params);
  }

  function updatePosition(value) {
    setPositionQuery(value);

    if (positionDebounceRef.current) {
      clearTimeout(positionDebounceRef.current);
    }

    if (value === filters.position) {
      return;
    }

    positionDebounceRef.current = setTimeout(() => {
      positionDebounceRef.current = null;
      updateFilter("position", value);
    }, 500);
  }

  function updateStatuses(statuses) {
    updateFilter("status", statuses.join(","));
  }

  function clearFilters() {
    if (positionDebounceRef.current) {
      clearTimeout(positionDebounceRef.current);
    }

    setPositionQuery("");

    const params = new URLSearchParams(searchParams.toString());

    params.delete("status");
    params.delete("qualified");
    params.delete("email");
    params.delete("linkedin");
    params.delete("linkedinProfile");
    params.delete("linkedin_profile");
    params.delete("category");
    params.delete("companyCategory");
    params.delete("company_category");
    params.delete("industry");
    params.delete("companyIndustry");
    params.delete("company_industry");
    params.delete("priority");
    params.delete("companyPriority");
    params.delete("company_priority");
    params.delete("position");
    params.delete("positionTitle");
    params.delete("position_title");
    params.delete("page");

    replaceWithParams(params);
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-end 2xl:flex-nowrap">
      <Field className="w-full sm:w-64">
        <Label htmlFor="people-filter-position">Position</Label>
        <Input
          id="people-filter-position"
          name="position"
          onChange={(event) => updatePosition(event.target.value)}
          placeholder="Title, department, or role..."
          type="search"
          value={positionQuery}
        />
      </Field>
      <StatusMultiSelect statuses={filters.status} onChange={updateStatuses} />
      <FilterSelect
        emptyLabel="All emails"
        label="Email"
        name="email"
        onChange={updateFilter}
        options={[
          { label: "Has email", value: "has" },
          { label: "Missing email", value: "missing" }
        ]}
        value={filters.email}
      />
      <FilterSelect
        emptyLabel="All LinkedIn"
        label="LinkedIn"
        name="linkedin"
        onChange={updateFilter}
        options={[
          { label: "Has LinkedIn", value: "has" },
          { label: "No LinkedIn", value: "missing" }
        ]}
        value={filters.linkedin}
      />
      <FilterSelect
        emptyLabel="All categories"
        label="Company category"
        name="category"
        onChange={updateFilter}
        options={options?.categories || []}
        value={filters.category}
        widthClass="sm:w-52"
      />
      <FilterSelect
        emptyLabel="All priorities"
        label="Company priority"
        name="priority"
        onChange={updateFilter}
        options={options?.priorities || []}
        value={filters.priority}
        widthClass="sm:w-52"
      />
      {hasFilters ? (
        <Button
          type="button"
          plain
          onClick={clearFilters}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
