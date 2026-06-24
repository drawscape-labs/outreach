import { StatusPill } from "./status-pill";

export function QualifiedStatus({ qualified }) {
  return (
    <StatusPill tone={qualified ? "teal" : "gray"}>
      {qualified ? "Yes" : "No"}
    </StatusPill>
  );
}
