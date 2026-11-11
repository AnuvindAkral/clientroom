import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ButtonHTMLAttributes, ComponentPropsWithRef, ReactNode } from 'react';
import { STATUS_LABELS, STATUSES, type Status } from './types';
import { formatDue, isOverdue } from './format';

/* ---------------- toasts ---------------- */

type ToastKind = 'ok' | 'error';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = nextId.current++;
    setItems((current) => [...current.slice(-2), { id, message, kind }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast${item.kind === 'error' ? ' error' : ''}`}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

/* ---------------- button ---------------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'default' | 'small';
}

export function Button({
  variant = 'primary',
  size = 'default',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    variant === 'primary' ? '' : variant,
    size === 'small' ? 'small' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}

/* ---------------- fields ---------------- */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <span className="error" id={`${htmlFor}-error`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}

interface TextInputProps extends ComponentPropsWithRef<'input'> {
  invalid?: boolean;
}

export function TextInput({ invalid, className = '', ...rest }: TextInputProps) {
  return (
    <input
      className={`input ${className}`.trim()}
      aria-invalid={invalid ? 'true' : undefined}
      {...rest}
    />
  );
}

/* ---------------- status ---------------- */

export function StatusStamp({ status }: { status: Status }) {
  return <span className={`stamp ${status}`}>{STATUS_LABELS[status]}</span>;
}

export function StatusSelect({
  value,
  onChange,
  label,
}: {
  value: Status;
  onChange: (next: Status) => void;
  label: string;
}) {
  return (
    <select
      className="status-select"
      data-status={value}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as Status)}
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

export function DueBadge({ dueDate, status }: { dueDate: string | null; status: Status }) {
  if (!dueDate) return <span className="date-input" aria-label="No due date">No date</span>;
  const overdue = isOverdue(dueDate, status);
  return (
    <span className={`date-input${overdue ? ' overdue' : ''}`}>
      {formatDue(dueDate)}
      {overdue ? ' · overdue' : ''}
    </span>
  );
}

/* ---------------- states ---------------- */

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <div className="skeleton" style={{ width: `${52 + index * 9}%` }} />
          <div className="skeleton" style={{ width: '70%' }} />
          <div className="skeleton" style={{ width: '55%' }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Banner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <Button variant="danger" size="small" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------- clipboard ---------------- */

export function useCopy() {
  const { show } = useToast();
  return useCallback(
    async (value: string, message = 'Copied') => {
      try {
        await navigator.clipboard.writeText(value);
        show(message);
      } catch {
        show('Could not copy. Select the text and copy it manually.', 'error');
      }
    },
    [show],
  );
}

/* ---------------- escape to close ---------------- */

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}
