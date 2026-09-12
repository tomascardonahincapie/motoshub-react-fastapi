import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import DetalleCatalogo from './pages/DetalleCatalogo';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';
import Login from './pages/Login';
import RestablecerPassword from './pages/RestablecerPassword';
import AdminPanel from './pages/admin/AdminPanel';
import EmployeePanel from './pages/EmployeePanel';
import ClientPanel from './pages/ClientPanel';

function AppShell() {
  const location = useLocation();
  // El panel de administración trae su propia barra lateral y cabecera.
  const esPanelAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen flex-col">
      {!esPanelAdmin && <Header />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/catalogo/producto/:id" element={<DetalleCatalogo tipo="producto" />} />
          <Route path="/catalogo/servicio/:id" element={<DetalleCatalogo tipo="servicio" />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/restablecer/:token" element={<RestablecerPassword />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute rolesPermitidos={['Administrador']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/empleado"
            element={
              <ProtectedRoute rolesPermitidos={['Empleado', 'Administrador']}>
                <EmployeePanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cliente"
            element={
              <ProtectedRoute rolesPermitidos={['Cliente', 'Administrador']}>
                <ClientPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {!esPanelAdmin && <Footer />}
      {!esPanelAdmin && <WhatsAppButton />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;
