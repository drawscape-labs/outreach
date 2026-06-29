"use client";

import { useState } from "react";
import { classNames } from "./class-names";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu
} from "./ui/dropdown";

export function EditableFieldMenu({
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
