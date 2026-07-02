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

export function PeopleFilters({ filters, options }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(
    filters.status ||
      filters.qualified ||
      filters.email ||
      filters.linkedin ||
      filters.category ||
      filters.priority
  );

  function replaceWithParams(params) {
    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false
    });
  }

  function updateFilter(name, value) {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("page");
    params.delete("industry");
    params.delete("companyIndustry");
    params.delete("company_industry");

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

  function clearFilters() {
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
    params.delete("page");

    replaceWithParams(params);
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:flex-nowrap xl:items-end">
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
