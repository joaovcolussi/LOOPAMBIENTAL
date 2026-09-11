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
