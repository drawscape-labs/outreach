"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { classNames, LeadStatus, QualifiedStatus } from "./components";
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
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);

  function updateMenuPosition() {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();

    setMenuPosition({
      left: rect.left,
      top: rect.bottom + 6,
      minWidth: Math.max(rect.width, 144)
    });
  }

  function toggleMenu() {
    if (isSaving) {
      return;
    }

    if (!isOpen) {
      updateMenuPosition();
    }

    setIsOpen((current) => !current);
  }

  async function handleSelect(option) {
    setIsOpen(false);

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

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleViewportChange() {
      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Change ${label}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={classNames(
          "rounded-full text-left outline-none transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
          isSaving && "cursor-wait opacity-60"
        )}
        onClick={toggleMenu}
      >
        {renderButton()}
      </button>

      {isOpen && menuPosition ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="fixed z-50 overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            minWidth: menuPosition.minWidth
          }}
        >
          {options.map((option) => {
            const isSelected = option.key === selectedKey;

            return (
              <button
                key={option.key}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                className={classNames(
                  "flex w-full items-center justify-between gap-x-3 px-3 py-2 text-left text-sm",
                  isSelected
                    ? "bg-teal-50 text-teal-900"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => handleSelect(option)}
              >
                {renderOption(option)}
                {isSelected ? (
                  <span className="text-xs font-medium text-teal-700">
                    Current
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <span className="sr-only" aria-live="polite">
          {error}
        </span>
      ) : null}
    </div>
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
