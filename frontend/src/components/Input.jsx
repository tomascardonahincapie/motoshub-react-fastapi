export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  maxLength,
  placeholder,
  icono = null,
  ayuda = null,
  autoComplete,
  autoFocus = false,
}) {
  const contador = maxLength ? `${value?.length || 0}/${maxLength}` : null;
  const casiLleno = maxLength && (value?.length || 0) > maxLength * 0.9;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
          {label}
        </label>
      )}

      <div className="relative">
        {icono && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-600">
            {icono}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          className={`campo ${error ? 'campo-error' : ''} ${icono ? 'pl-10' : ''}`}
        />
      </div>

      <div className="mt-1.5 flex items-start justify-between gap-2">
        {error ? (
          <p className="flex items-center gap-1 text-xs text-danger-400">
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        ) : ayuda ? (
          <p className="text-xs text-mist-600">{ayuda}</p>
        ) : (
          <span />
        )}
        {contador && (
          <span className={`shrink-0 text-[0.7rem] tabular-nums ${casiLleno ? 'text-brand-400' : 'text-mist-600'}`}>
            {contador}
          </span>
        )}
      </div>
    </div>
  );
}
