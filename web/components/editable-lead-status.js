"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUSES } from "../lib/statuses";
import { EditableFieldMenu } from "./editable-field-menu";
import { LeadStatus } from "./lead-status";
import { updatePerson } from "./update-person";

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
