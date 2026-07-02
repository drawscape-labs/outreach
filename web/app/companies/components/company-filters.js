"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Field, Label } from "../../../components/ui/fieldset";
import { Select } from "../../../components/ui/select";

function FilterSelect({
  emptyLabel,
  label,
  name,
  onChange,
  options,
  value,
  widthClass = "sm:w-56"
}) {
  const id = `company-filter-${name}`;

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

export function CompanyFilters({ filters, options }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(
    filters.category ||
      filters.industry ||
      filters.priority ||
      filters.contacts
  );

  function updateFilter(name, value) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("location");
    params.delete("page");

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <FilterSelect
        emptyLabel="All categories"
        label="Category"
        name="category"
        onChange={updateFilter}
        options={options.categories}
        value={filters.category}
      />
      <FilterSelect
        emptyLabel="All industries"
        label="Industry"
        name="industry"
        onChange={updateFilter}
        options={options.industries.map((industry) => ({
          label: industry,
          value: industry
        }))}
        value={filters.industry}
        widthClass="sm:w-96"
      />
      <FilterSelect
        emptyLabel="All priorities"
        label="Priority"
        name="priority"
        onChange={updateFilter}
        options={options.priorities}
        value={filters.priority}
      />
      <FilterSelect
        emptyLabel="All contacts"
        label="Has contacts"
        name="contacts"
        onChange={updateFilter}
        options={[
          { label: "Has contacts", value: "with_people" },
          { label: "No contacts", value: "without_people" }
        ]}
        value={filters.contacts}
      />
      {hasFilters ? (
        <Button
          type="button"
          plain
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
