export function formatMoney(amount: string | number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatQuantity(amount: string | number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(Number(amount));
}

export function formatCurrencyInput(value: string) {
  if (!value) return '';
  return formatMoney(value);
}

export function currencyInputToDecimal(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return (Number(digits) / 100).toFixed(2);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

/** Formats a date-only value (YYYY-MM-DD or ISO at UTC midnight) without timezone drift. */
export function formatDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function isDateOnlyExpired(value: string, today = new Date()) {
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return value.slice(0, 10) < todayKey;
}
