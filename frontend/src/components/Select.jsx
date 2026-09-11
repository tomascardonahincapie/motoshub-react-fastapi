export default function Select({ label, name, value, onChange, onBlur, error, options, placeholder = 'Selecciona una opción' }) {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={!!error}
          className={`campo cursor-pointer appearance-none pr-10 ${error ? 'campo-error' : ''}`}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Flecha propia: la nativa no se puede estilizar */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist-500">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
