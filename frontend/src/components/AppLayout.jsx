import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatAccessLevel } from '../lib/accessLevel';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/ordens', label: 'Ordens de Serviço' },
  { path: '/clientes', label: 'Clientes' },
  { path: '/equipamentos', label: 'Equipamentos' },
  { path: '/pagamentos', label: 'Pagamentos' },
  { path: '/pecas', label: 'Peças' },
  { path: '/funcionarios', label: 'Funcionários' },
  { path: '/cargos', label: 'Cargos' },
  { path: '/fotos', label: 'Fotos' },
  { path: '/notificacoes', label: 'Notificações' },
  { path: '/relatorios', label: 'Relatórios' }
];

export function AppLayout() {
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-block">
          <span className="brand-badge">AT</span>
          <div>
            <strong>Assistência SaaS</strong>
            <small>Painel Operacional</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>{user?.nome || 'Usuário autenticado'}</p>
          <small className="sidebar-role">Nível de acesso: {formatAccessLevel(user?.nivel_acesso)}</small>
          <button type="button" className="button button-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
          >
            Menu
          </button>
          <div>
            <h1>Central de Gestão</h1>
          </div>
        </header>

        <section className="workspace-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
