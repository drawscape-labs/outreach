"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { classNames } from "./components";

function IconDots() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
      <circle cx="10" cy="4" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CampaignSelectIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500"
    >
      <path
        fill="currentColor"
        d="M5.2 7.5a1 1 0 0 1 1.4 0L10 10.9l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.9a1 1 0 0 1 0-1.4Z"
      />
    </svg>
  );
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function CampaignModal({ personId, personName, email, onClose }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const titleId = `campaign-modal-${personId}`;

  useEffect(() => {
    let isMounted = true;

    async function loadCampaigns() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await fetchJson("/api/quickmail/campaigns");

        if (!isMounted) {
          return;
        }

        setCampaigns(payload.campaigns || []);
        setSelectedCampaignId(payload.campaigns?.[0]?.id || "");
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose]);

  const selectedCampaign = campaigns.find(
    (campaign) => campaign.id === selectedCampaignId
  );
  const canSubmit = Boolean(email && selectedCampaign && !isLoading && !isSaving);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email) {
      setError("This person needs an email before they can be added.");
      return;
    }

    if (!selectedCampaign) {
      setError("Select a campaign.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await fetchJson(
        `/api/quickmail/campaigns/${encodeURIComponent(selectedCampaign.id)}/leads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            personId,
            workspaceId: selectedCampaign.workspaceId,
            markContacted: true
          })
        }
      );

      setSuccess("Added to campaign.");
      router.refresh();
      window.setTimeout(onClose, 700);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="absolute inset-0 bg-gray-500/75"
        aria-label="Close"
        onClick={() => {
          if (!isSaving) {
            onClose();
          }
        }}
      />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-left sm:items-center sm:p-0">
          <form
            className="relative w-full overflow-hidden rounded-lg bg-white shadow-xl sm:my-8 sm:max-w-md"
            onSubmit={handleSubmit}
          >
            <div className="px-4 pt-5 pb-4 sm:p-6">
              <h2 id={titleId} className="text-base font-semibold text-gray-900">
                Add to campaign
              </h2>
              <p className="mt-1 text-sm text-gray-500">{personName}</p>

              <div className="mt-5">
                <label
                  htmlFor={`campaign-${personId}`}
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  Campaign
                </label>
                <div className="mt-2 grid grid-cols-1">
                  <select
                    id={`campaign-${personId}`}
                    value={selectedCampaignId}
                    disabled={isLoading || isSaving || campaigns.length === 0}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                    onChange={(event) => setSelectedCampaignId(event.target.value)}
                  >
                    {campaigns.length ? (
                      campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {isLoading ? "Loading campaigns..." : "No campaigns found"}
                      </option>
                    )}
                  </select>
                  <CampaignSelectIcon />
                </div>
              </div>

              {selectedCampaign?.workspaceName ? (
                <p className="mt-2 text-xs text-gray-500">
                  {selectedCampaign.workspaceName}
                </p>
              ) : null}

              {!email ? (
                <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-600/20">
                  Add an email before sending this person to QuickMail.
                </p>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-600/20">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-600/20">
                  {success}
                </p>
              ) : null}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex w-full justify-center rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-gray-300 sm:ml-3 sm:w-auto"
              >
                {isSaving ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0 sm:w-auto"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function PersonActions({ personId, personName, email }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function updateMenuPosition() {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const width = 192;

    setMenuPosition({
      left: Math.max(8, rect.right - width),
      top: Math.min(rect.bottom + 6, window.innerHeight - 56),
      width
    });
  }

  function toggleMenu() {
    if (!isMenuOpen) {
      updateMenuPosition();
    }

    setIsMenuOpen((current) => !current);
  }

  function openModal() {
    setIsMenuOpen(false);
    setIsModalOpen(true);
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    function handleViewportChange() {
      setIsMenuOpen(false);
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
  }, [isMenuOpen]);

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        className="inline-flex min-h-9 items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-600 outline-none ring-1 ring-gray-200 ring-inset hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        onClick={toggleMenu}
      >
        <span>action</span>
        <IconDots />
      </button>

      {isMenuOpen && menuPosition ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${personName}`}
          className="fixed z-50 overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
          style={menuPosition}
        >
          <button
            type="button"
            role="menuitem"
            className={classNames(
              "block w-full px-4 py-2 text-left text-sm text-gray-700",
              "hover:bg-gray-50 hover:text-gray-900"
            )}
            onClick={openModal}
          >
            Add to campaign
          </button>
        </div>
      ) : null}

      {isModalOpen ? (
        <CampaignModal
          personId={personId}
          personName={personName}
          email={email}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
