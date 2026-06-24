"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { classNames, LeadStatus, QualifiedStatus } from "./index";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu
} from "./ui/dropdown";
import { LEAD_STATUSES } from "../lib/statuses";

async function updatePerson(personId, body) {
  const response = await fetch(`/api/people/${personId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Could not update person.");
  }

  return response.json();
}

function EditableFieldMenu({
  label,
  options,
  selectedKey,
  renderButton,
  renderOption,
  onSelect
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSelect(option) {
    if (option.key === selectedKey) {
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await onSelect(option);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dropdown>
      <DropdownButton
        as="button"
        type="button"
        disabled={isSaving}
        aria-label={`Change ${label}`}
        className={classNames(
          "rounded-md text-left outline-none transition data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500",
          isSaving && "cursor-wait opacity-60"
        )}
      >
        {renderButton()}
      </DropdownButton>

      <DropdownMenu anchor="bottom start" aria-label={label} className="min-w-36">
        {options.map((option) => {
          const isSelected = option.key === selectedKey;

          return (
            <DropdownItem
              key={option.key}
              aria-current={isSelected ? "true" : undefined}
              className={isSelected ? "bg-teal-50 text-teal-900" : undefined}
              onClick={() => handleSelect(option)}
            >
              <DropdownLabel>
                {renderOption(option)}
              </DropdownLabel>
              {isSelected ? (
                <span className="col-start-5 row-start-1 text-xs font-medium text-teal-700 group-data-focus:text-white">
                  Current
                </span>
              ) : null}
            </DropdownItem>
          );
        })}
      </DropdownMenu>

      {error ? (
        <span className="sr-only" aria-live="polite">
          {error}
        </span>
      ) : null}
    </Dropdown>
  );
}

export function EditableLeadStatus({ personId, status }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);

  return (
    <EditableFieldMenu
      label="status"
      options={LEAD_STATUSES.map((option) => ({
        key: option,
        value: option
      }))}
      selectedKey={currentStatus}
      renderButton={() => <LeadStatus status={currentStatus} />}
      renderOption={(option) => <LeadStatus status={option.value} />}
      onSelect={async (option) => {
        const previousStatus = currentStatus;

        setCurrentStatus(option.value);

        try {
          await updatePerson(personId, { status: option.value });
          router.refresh();
        } catch (error) {
          setCurrentStatus(previousStatus);
          throw error;
        }
      }}
    />
  );
}

export function EditableQualifiedStatus({ personId, qualified }) {
  const router = useRouter();
  const [isQualified, setIsQualified] = useState(Boolean(qualified));

  return (
    <EditableFieldMenu
      label="qualified"
      options={[
        { key: "yes", value: true },
        { key: "no", value: false }
      ]}
      selectedKey={isQualified ? "yes" : "no"}
      renderButton={() => <QualifiedStatus qualified={isQualified} />}
      renderOption={(option) => <QualifiedStatus qualified={option.value} />}
      onSelect={async (option) => {
        const previousQualified = isQualified;

        setIsQualified(option.value);

        try {
          await updatePerson(personId, { qualified: option.value });
          router.refresh();
        } catch (error) {
          setIsQualified(previousQualified);
          throw error;
        }
      }}
    />
  );
}
