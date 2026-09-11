/**
 * Botón reutilizable de la aplicación.
 * Los estilos viven en index.css (.btn y sus variantes) para que todos los
 * botones compartan el mismo foco, hover y estado inactivo.
 */
export default function Button({
  children,
  type = 'button',
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  ancho = 'completo',
  icono = null,
}) {
  const variantes = {
    primary: 'btn-primario',
    secondary: 'btn-secundario',
    ghost: 'btn-fantasma',
    danger: 'btn-peligro',
    whatsapp: 'btn-whatsapp',
    // Enlace de texto: sin fondo ni mayúsculas, para acciones secundarias.
    text: 'bg-transparent text-brand-400 hover:text-brand-300 normal-case tracking-normal font-semibold !px-0 !py-1',
  };

  const anchos = { completo: 'w-full', auto: 'w-auto' };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantes[variant]} ${anchos[ancho]} ${className}`}
    >
      {icono}
      {children}
    </button>
  );
}
