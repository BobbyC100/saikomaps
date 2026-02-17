/**
 * SimpleTable Component
 * Generic table for admin data display
 */

interface Column {
  key: string;
  label: string;
}

interface SimpleTableProps {
  columns: Column[];
  rows: Record<string, any>[];
}

export function SimpleTable({ columns, rows }: SimpleTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-gray-500 italic py-4">
        No data to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {columns.map((col) => {
                const value = row[col.key];
                let displayValue: string;

                // Handle different value types
                if (value === null || value === undefined) {
                  displayValue = '—';
                } else if (Array.isArray(value)) {
                  displayValue = value.join(', ');
                } else if (typeof value === 'bigint') {
                  displayValue = value.toString();
                } else if (typeof value === 'number') {
                  // Format percentages with 1 decimal place
                  displayValue = col.key.includes('pct') 
                    ? `${value.toFixed(1)}%`
                    : value.toString();
                } else {
                  displayValue = String(value);
                }

                return (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
