import { ChangeEvent } from 'react';
import { currencyInputToDecimal, formatCurrencyInput } from '../lib/format';

type CurrencyInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  id?: string;
};

export function CurrencyInput({
  value,
  onChange,
  required,
  placeholder = 'R$ 0,00',
  id,
}: CurrencyInputProps) {
  function change(event: ChangeEvent<HTMLInputElement>) {
    onChange(currencyInputToDecimal(event.target.value));
  }

  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      required={required}
      value={formatCurrencyInput(value)}
      onChange={change}
      placeholder={placeholder}
      aria-label="Valor em reais"
    />
  );
}
