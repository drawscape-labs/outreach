"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Field, Label } from "../../../components/ui/fieldset";
import { Select } from "../../../components/ui/select";
import { LEAD_STATUSES } from "../../../lib/statuses";

function FilterSelect({
  emptyLabel,
  label,
  name,
  onChange,
  options,
  value
}) {
  const id = `people-filter-${name}`;

  return (
    <Field className="w-full sm:w-52">
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

export function PeopleFilters({ filters }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(filters.status || filters.qualified || filters.email);

  function replaceWithParams(params) {
    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false
    });
  }

  function updateFilter(name, value) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    replaceWithParams(params);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("status");
    params.delete("qualified");
    params.delete("email");

    replaceWithParams(params);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <FilterSelect
        emptyLabel="All statuses"
        label="Status"
        name="status"
        onChange={updateFilter}
        options={LEAD_STATUSES.map((status) => ({
          label: status,
          value: status
        }))}
        value={filters.status}
      />
      <FilterSelect
        emptyLabel="All qualified"
        label="Qualified"
        name="qualified"
        onChange={updateFilter}
        options={[
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" }
        ]}
        value={filters.qualified}
      />
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
