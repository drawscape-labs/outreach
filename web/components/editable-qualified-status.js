"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditableFieldMenu } from "./editable-field-menu";
import { QualifiedStatus } from "./qualified-status";
import { updatePerson } from "./update-person";

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
