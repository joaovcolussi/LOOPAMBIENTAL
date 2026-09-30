'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  pending?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  requireReason = false,
  reasonLabel = 'Motivo',
  reasonPlaceholder,
  minReasonLength = 3,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setReason('');
      setError('');
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (requireReason && trimmed.length < minReasonLength) {
      setError(`Informe pelo menos ${minReasonLength} caracteres.`);
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <form method="dialog" className="confirm-dialog-form" onSubmit={submit}>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        {requireReason && (
          <label className="confirm-dialog-reason">
            <span>{reasonLabel}</span>
            <textarea
              id={reasonId}
              value={reason}
              rows={3}
              maxLength={500}
              placeholder={reasonPlaceholder}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${reasonId}-error` : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                if (error) setError('');
              }}
            />
            {error && (
              <small id={`${reasonId}-error`} className="form-error">
                {error}
              </small>
            )}
          </label>
        )}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className={tone === 'danger' ? 'reject-button' : 'button'}
            disabled={pending}
          >
            {pending ? 'Processando…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
