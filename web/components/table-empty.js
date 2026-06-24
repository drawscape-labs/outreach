import { TableCell, TableRow } from "./ui/table";

export function TableEmpty({ colSpan, children }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center font-medium text-zinc-500">
        {children}
      </TableCell>
    </TableRow>
  );
}
