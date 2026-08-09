export function formatDDMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  if (typeof dateInput === 'string' && dateInput.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const parts = dateInput.slice(0, 10).split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTimeDDMMYYYYHHmm(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Never';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Never';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

