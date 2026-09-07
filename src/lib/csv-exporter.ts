/**
 * Reusable utility to generate and download client-side CSV spreadsheet files.
 */
export function exportToCSV(data: any[], headers: { key: string, label: string }[], filename: string) {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // 1. Generate CSV content with proper escaping for commas and double-quotes
  const csvContent = [
    // Header row
    headers.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(','),
    // Data rows
    ...data.map(row =>
      headers.map(h => {
        const val = row[h.key];
        const valStr = val === undefined || val === null ? '' : String(val);
        // Escape double quotes by doubling them, wrap in quotes
        return `"${valStr.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // 2. Create blob and download trigger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
