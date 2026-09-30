export function TableLoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr className="admin-table-loading">
      <td colSpan={colSpan} role="status">
        Carregando…
      </td>
    </tr>
  );
}
