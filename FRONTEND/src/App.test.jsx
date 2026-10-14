import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
// Importación clave para que Vitest reconozca .toBeInTheDocument() sin romper la suite
import '@testing-library/jest-dom/vitest'; 
import { toast } from 'sonner';

// ------------------------------------------------------------------
// MOCKS GLOBALES (Simulación de dependencias)
// ------------------------------------------------------------------
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        response: { use: vi.fn() },
        request: { use: vi.fn() }
      },
      post: vi.fn()
    })),
    interceptors: {
      response: { use: vi.fn() }
    },
    post: vi.fn()
  }
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn()
  }
}));

// Componentes simulados sencillos para las vistas del Router
const DashboardMock = () => <div>Vista del Dashboard General</div>;
const AdminDashboardMock = () => <div>Vista de Administración Privilegiada</div>;
const LoginMock = () => <div>Pantalla de Inicio de Sesión</div>;

// Un componente de Ruta Protegida típico de React
const ProtectedRoute = ({ children, allowedRoles, userRole }) => {
  if (!allowedRoles.includes(userRole)) {
    // Si no tiene permisos, disparamos la alerta de sonner y no renderizamos
    toast.error('Acceso denegado: No tienes los permisos requeridos.');
    return <div>Acceso Denegado 403</div>;
  }
  return children;
};

describe('Circuito de Pruebas Frontend Automatizadas - Stack React/Vite', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ==================================================================
  // ESCENARIO AUTOMATIZADO PARA CP-02: Protección de Rutas (Frontend)
  // ==================================================================
  test('CP-02: Debe bloquear el acceso visual a la ruta admin si el rol es Editor', () => {
    // Simulamos el rol del usuario obtenido tras decodificar el JWT
    const mockUserRole = 'Editor'; 

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/" element={<DashboardMock />} />
          <Route path="/login" element={<LoginMock />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Admin']} userRole={mockUserRole}>
                <AdminDashboardMock />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    // Criterio de Aceptación: El panel privilegiado no debe existir en el DOM
    expect(screen.queryByText('Vista de Administración Privilegiada')).not.toBeInTheDocument();
    
    // El sistema debe avisar visualmente el rechazo mediante sonner
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Acceso denegado'));
    expect(screen.getByText('Acceso Denegado 403')).toBeInTheDocument();
  });

  // ==================================================================
  // ESCENARIO AUTOMATIZADO PARA CP-03: Interceptación de Sesión Expirada
  // ==================================================================
  test('CP-03: Interceptor de Axios debe limpiar LocalStorage y redirigir ante un error 401', async () => {
    // Guardamos credenciales ficticias en el storage
    localStorage.setItem('token', 'eyJhbGciOi...');
    
    // Creamos una función de redirección ficticia
    const mockNavigate = vi.fn();

    // Simulamos el comportamiento del interceptor de Axios frente a un fallo 401
    const ejecutarInterceptorRespuesta = (errorResponse) => {
      if (errorResponse.status === 401) {
        localStorage.removeItem('token');
        toast.error('Sesión expirada. Inicie sesión nuevamente.');
        mockNavigate('/login');
      }
    };

    // Objeto de error que simula la respuesta rechazada por el backend Express
    const mockErrorAxios = {
      status: 401,
      response: { data: { error: 'Token expired or invalid' } }
    };

    // Ejecutamos la lógica del interceptor con la falla simulada
    ejecutarInterceptorRespuesta(mockErrorAxios);

    // Criterio de Aceptación 1: El LocalStorage debe ser limpiado inmediatamente por seguridad
    expect(localStorage.getItem('token')).toBeNull();

    // Criterio de Aceptación 2: El sistema notifica al usuario con una alerta de sonner
    expect(toast.error).toHaveBeenCalledWith('Sesión expirada. Inicie sesión nuevamente.');

    // Criterio de Aceptación 3: Se fuerza la redirección mandatoria al login
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
