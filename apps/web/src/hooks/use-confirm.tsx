'use client';

import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/confirm-dialog';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  requireReason?: boolean;
  reasonLabel?: string;
  minReasonLength?: number;
};

/**
 * Promise-based replacement for window.confirm/window.prompt backed by the
 * accessible ConfirmDialog. Resolves with the typed reason ('' when no reason
 * is requested) or null when cancelled. Render `dialog` once in the page.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(null);
    setOptions(next);
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = (
    <ConfirmDialog
      open={options !== null}
      title={options?.title ?? ''}
      description={options?.description}
      confirmLabel={options?.confirmLabel}
      tone={options?.tone}
      requireReason={options?.requireReason}
      reasonLabel={options?.reasonLabel}
      minReasonLength={options?.minReasonLength}
      onConfirm={(reason) => close(reason)}
      onCancel={() => close(null)}
    />
  );

  return { confirm, dialog };
}
