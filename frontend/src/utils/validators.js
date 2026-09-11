export const patterns = {
  nombre: /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,50}$/,
  documento: /^[0-9]{6,15}$/,
  telefono: /^[0-9]{7,10}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,20}$/,
  direccion: /^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ#\-.,\s]{5,100}$/,
};

export function validateField(name, value, formData = {}) {
  const val = value.trim();

  switch (name) {
    case 'nombres':
    case 'apellidos':
      if (!val) return 'Este campo es obligatorio';
      if (!patterns.nombre.test(val)) return 'Solo letras, entre 2 y 50 caracteres';
      return '';

    case 'tipo_documento':
      if (!val) return 'Selecciona un tipo de documento';
      return '';

    case 'numero_documento':
      if (!val) return 'Este campo es obligatorio';
      if (!patterns.documento.test(val)) return 'Solo números, entre 6 y 15 dígitos';
      return '';

    case 'direccion':
      if (!val) return 'Este campo es obligatorio';
      if (!patterns.direccion.test(val)) return 'Dirección inválida (5 a 100 caracteres)';
      return '';

    case 'telefono':
      if (!val) return 'Este campo es obligatorio';
      if (!patterns.telefono.test(val)) return 'Solo números, entre 7 y 10 dígitos';
      return '';

    case 'email':
      if (!val) return 'Este campo es obligatorio';
      if (!patterns.email.test(val)) return 'Formato de correo inválido';
      return '';

    case 'password':
      if (!val) return 'Este campo es obligatorio';
      if (!patterns.password.test(val)) {
        return 'Mínimo 8 caracteres, con mayúscula, minúscula y número';
      }
      return '';

    case 'confirmPassword':
      if (!val) return 'Confirma tu contraseña';
      if (val !== formData.password) return 'Las contraseñas no coinciden';
      return '';

    default:
      return '';
  }
}
