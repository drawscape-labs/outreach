import { Table } from "./ui/table";

export function DataTable({ children }) {
  return (
    <Table
      bleed
      dense
      className="!mx-0 [--gutter:1rem] sm:[--gutter:1.5rem]"
    >
      {children}
    </Table>
  );
}
