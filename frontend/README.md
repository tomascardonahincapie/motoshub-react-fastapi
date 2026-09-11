# MotosHub - Aplicación React + Vite

> **Cuarto avance:** este Frontend ya no funciona solo como interfaz visual.
> Consume la API REST construida con **FastAPI** que está en `../backend`
> (registro, inicio de sesión con JWT, control de roles y CRUD sobre MySQL).
>
> Antes de ejecutar `npm run dev`, copia `.env.example` a `.env` y levanta el
> Backend. La URL de la API se configura en `VITE_API_URL`
> (por defecto `http://localhost:8000/api`).
>
> Las instrucciones completas están en `../README.md`.

## Descripción del Proyecto

**MotosHub** es una aplicación web moderna desarrollada con React + Vite que presenta un catálogo de 10 motos de alta gama con un carrusel interactivo. La aplicación utiliza React Router DOM para la navegación entre páginas y sigue las mejores prácticas de organización de código.

### Tema: Motos 🏍️

## Características Principales

### 1. **Carrusel Interactivo** 
- Muestra 10 motos diferentes con imágenes de alta calidad
- Cada moto incluye: título, descripción y año de fabricación
- Navegación mediante botones (Anterior/Siguiente)
- Indicadores numéricos para saltar a una moto específica
- Contador que muestra posición actual (ej: 3 de 10)
- Animaciones suaves en la transición de imágenes

### 2. **Páginas Principales**
- **Inicio (/)**: Página principal con héroe, carrusel destacado y características
- **Quiénes Somos (/about)**: Información sobre MotosHub, historia, misión y estadísticas
- **Contacto (/contact)**: Formulario de contacto, información de ubicación y FAQ

### 3. **Navegación**
- Header sticky con logo y menú de navegación
- Enlaces activos con estilo hover
- Footer con información de contacto

### 4. **Motos Incluidas**
1. Yamaha YZF-R1 (2024)
2. Harley-Davidson Street 750 (2023)
3. Ducati Panigale V4 (2024)
4. Honda CB500F (2023)
5. BMW S1000RR (2024)
6. Kawasaki Ninja H2 (2023)
7. KTM 390 Duke (2024)
8. Suzuki Hayabusa (2023)
9. Triumph Street Triple (2024)
10. Royal Enfield Classic 350 (2023)

## Estructura del Proyecto

```
motos-react-app/
├── src/
│   ├── components/           # Componentes reutilizables
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── Carousel.jsx
│   ├── pages/                # Páginas de la aplicación
│   │   ├── Home.jsx
│   │   ├── AboutUs.jsx
│   │   └── Contact.jsx
│   ├── data/                 # Datos de la aplicación
│   │   └── bikesData.js
│   ├── styles/               # Estilos CSS
│   │   ├── Header.css
│   │   ├── Footer.css
│   │   ├── Carousel.css
│   │   ├── Home.css
│   │   ├── AboutUs.css
│   │   └── Contact.css
│   ├── assets/               # Assets (imágenes, etc)
│   │   └── images/
│   ├── App.jsx               # Componente raíz
│   ├── App.css               # Estilos globales
│   ├── index.css             # Estilos de base
│   └── main.jsx              # Punto de entrada
├── vite.config.js            # Configuración de Vite
├── package.json              # Dependencias
└── index.html                # HTML base
```

## Tecnologías Utilizadas

- **React 19.2.8**: Librería de UI
- **Vite 8.2.0**: Build tool y dev server
- **React Router DOM 6**: Enrutamiento
- **CSS3**: Estilos y animaciones
- **JavaScript ES6+**: Lógica de la aplicación

## Instalación y Ejecución

### Requisitos
- Node.js 16+ instalado

### Pasos de Instalación

1. **Navegar al directorio del proyecto**
```bash
cd motos-react-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

4. **Abrir en el navegador**
```
http://localhost:5173/
```

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run preview` - Previsualiza la versión de producción
- `npm run lint` - Ejecuta linter (Oxlint)

## Componentes Personalizados

### Carousel.jsx
```jsx
<Carousel bikes={bikesData} />
```
- Componente reutilizable que recibe un array de motos
- Maneja estado interno para la posición actual
- Proporciona navegación completa y controles interactivos

### Header.jsx
- Componente de encabezado sticky
- Menú de navegación con Links de React Router
- Responsive design

### Footer.jsx
- Información de contacto
- Copyright automático
- Diseño responsive en grid

## Estilos y Diseño

### Paleta de Colores
- **Primario**: #ff6b35 (Naranja vibrante)
- **Oscuro**: #1a1a1a (Negro profundo)
- **Fondo**: #f5f5f5 (Gris claro)
- **Texto**: #333 (Gris oscuro)

### Características de Diseño
- Diseño responsivo (Mobile-first)
- Gradientes lineales en componentes destacados
- Sombras suaves para profundidad
- Animaciones smooth en transiciones
- Iconos emoji para visual appeal

## Buenas Prácticas Implementadas

✅ Separación de componentes por responsabilidad
✅ Componentes funcionales con hooks
✅ Estructura de carpetas escalable
✅ Estilos modularizados (CSS por componente)
✅ Variables CSS para temas
✅ Datos separados en archivo independiente
✅ React Router para SPA
✅ Responsive design
✅ Validación de formularios
✅ Optimización de imágenes (URLs externas)

## Personalización

### Agregar Nueva Moto
Edita `src/data/bikesData.js` y agrega un objeto con:
```javascript
{
  id: 11,
  title: "Nueva Moto",
  year: 2024,
  description: "Descripción...",
  image: "URL_imagen"
}
```

### Cambiar Colores
Edita `src/index.css` y modifica las variables CSS en `:root`

## Deploy

Para desplegar en producción:

1. **Build del proyecto**
```bash
npm run build
```

2. **Archivo generado**: `dist/`

3. **Desplegar en servicios como:**
   - Vercel
   - Netlify
   - GitHub Pages
   - AWS S3
   - Firebase Hosting

## Mejoras Futuras

- [ ] Agregar más motos al catálogo
- [ ] Integración con API de datos
- [ ] Sistema de favoritos/wishlist
- [ ] Comparador de motos
- [ ] Galería de imágenes ampliada
- [ ] Comentarios y ratings
- [ ] Autenticación de usuarios
- [ ] Carrito de compras
- [ ] Base de datos en backend

## Soporte

Para reportar problemas o sugerencias, contacta a través del formulario en la página de Contacto.

---

**Desarrollado con ❤️ por MotosHub**
**Versión 1.0.0**
