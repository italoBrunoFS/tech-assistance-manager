import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, EmptyState, InlineMessage } from '../components/Ui';
import { backendApi } from '../services/backendApi';
import { extractApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  formatAccessLevel,
  hasAdminAccess,
  hasManagerAccess,
  toAccessLevel
} from '../lib/accessLevel';

const initialForm = {
  nome: '',
  email: '',
  senha: '',
  nivel_acesso: 1,
  id_cargo: ''
};

function resolveAccessLevelByCargo(cargos, cargoId) {
  const parsedCargoId = Number(cargoId);

  if (!Number.isInteger(parsedCargoId) || parsedCargoId <= 0) {
    return null;
  }

  const selectedCargo = cargos.find((cargo) => Number(cargo.id_cargo) === parsedCargoId);
  return toAccessLevel(selectedCargo?.nivel_acesso);
}

function resolveCargoNameById(cargos, cargoId) {
  const parsedCargoId = Number(cargoId);

  if (!Number.isInteger(parsedCargoId) || parsedCargoId <= 0) {
    return '-';
  }

  const selectedCargo = cargos.find((cargo) => Number(cargo.id_cargo) === parsedCargoId);
  return selectedCargo?.nome_cargo || `Cargo #${parsedCargoId}`;
}

export function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const formPanelRef = useRef(null);

  const sortedCargosByLevel = useMemo(() => {
    return [...cargos].sort((a, b) => {
      const levelA = toAccessLevel(a.nivel_acesso) ?? 1;
      const levelB = toAccessLevel(b.nivel_acesso) ?? 1;

      if (levelA !== levelB) {
        return levelA - levelB;
      }

      return String(a.nome_cargo || '').localeCompare(String(b.nome_cargo || ''), 'pt-BR');
    });
  }, [cargos]);

  const isManager = useMemo(
    () => hasManagerAccess(user?.nivel_acesso),
    [user?.nivel_acesso]
  );

  const isAdmin = useMemo(
    () => hasAdminAccess(user?.nivel_acesso),
    [user?.nivel_acesso]
  );

  async function loadData() {
    setIsLoading(true);
    try {
      const [employeesResponse, cargoResponse] = await Promise.all([
        backendApi.employees.list(),
        backendApi.cargo.list()
      ]);
      setEmployees(employeesResponse.data || []);
      setCargos(cargoResponse.data || []);
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function scrollToFormPanel() {
    window.requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isManager) {
      setStatus({ type: 'error', text: 'Somente admin ou gerente podem alterar funcionários.' });
      return;
    }

    const payload = {
      nome: form.nome,
      email: form.email,
      id_cargo: form.id_cargo ? Number(form.id_cargo) : null
    };
    const deducedAccessLevel = resolveAccessLevelByCargo(cargos, form.id_cargo);

    if (deducedAccessLevel !== null) {
      payload.nivel_acesso = deducedAccessLevel;
    } else if (editingId) {
      payload.nivel_acesso = toAccessLevel(form.nivel_acesso) ?? 1;
    } else {
      payload.nivel_acesso = 1;
    }

    if (form.senha) {
      payload.senha = form.senha;
    }

    try {
      if (editingId) {
        await backendApi.employees.update(editingId, payload);
        setStatus({ type: 'success', text: 'Funcionário atualizado com sucesso.' });
      } else {
        if (!form.senha) {
          setStatus({ type: 'error', text: 'Senha é obrigatória para criar funcionário.' });
          return;
        }

        await backendApi.employees.create(payload);
        setStatus({ type: 'success', text: 'Funcionário criado com sucesso.' });
      }

      resetForm();
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleDelete(employeeId) {
    if (!isAdmin) {
      setStatus({ type: 'error', text: 'Apenas administradores podem remover funcionários.' });
      return;
    }

    if (!window.confirm('Deseja remover este funcionário?')) {
      return;
    }

    try {
      await backendApi.employees.remove(employeeId);
      setStatus({ type: 'success', text: 'Funcionário removido com sucesso.' });
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  return (
    <div className="page-stack">
      <div ref={formPanelRef}>
      <Panel
        title="Gestão de funcionários"
        subtitle="Rotas protegidas por perfil (admin/gerente)"
      >
        <InlineMessage type={!isManager ? 'info' : 'success'}>
          {!isManager
            ? 'Seu perfil só pode visualizar os dados. Alterações exigem nível admin/gerente.'
            : 'Seu perfil permite criar e editar funcionários.'}
        </InlineMessage>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              type="text"
              value={form.nome}
              onChange={(event) => setForm((value) => ({ ...value, nome: event.target.value }))}
              disabled={!isManager}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
              disabled={!isManager}
              required
            />
          </label>

          <label>
            Senha {editingId ? '(opcional)' : ''}
            <input
              type="password"
              minLength={6}
              value={form.senha}
              onChange={(event) => setForm((value) => ({ ...value, senha: event.target.value }))}
              disabled={!isManager}
              required={!editingId}
            />
          </label>

          <label>
            Nível de acesso
            <input
              type="number"
              value={toAccessLevel(form.nivel_acesso) ?? 1}
              disabled
              readOnly
            />
          </label>

          <label>
            Cargo
            <select
              value={form.id_cargo}
              onChange={(event) => {
                const selectedCargoId = event.target.value;
                const deducedAccessLevel = resolveAccessLevelByCargo(cargos, selectedCargoId);

                setForm((value) => ({
                  ...value,
                  id_cargo: selectedCargoId,
                  nivel_acesso: deducedAccessLevel ?? 1
                }));
              }}
              disabled={!isManager}
            >
              <option value="">Sem cargo</option>
              {sortedCargosByLevel.map((cargo) => (
                <option key={cargo.id_cargo} value={cargo.id_cargo}>
                  {cargo.nome_cargo} (nivel {formatAccessLevel(cargo.nivel_acesso)})
                </option>
              ))}
            </select>
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={!isManager}>
              {editingId ? 'Atualizar funcionário' : 'Cadastrar funcionário'}
            </button>
            <button type="button" className="button button-ghost" onClick={resetForm}>
              Limpar
            </button>
          </div>
        </form>
      </Panel>
      </div>

      <Panel title="Funcionários cadastrados" subtitle="Dados de /employees">
        <InlineMessage type={status.type}>{status.text}</InlineMessage>

        {isLoading ? <p>Carregando funcionários...</p> : null}

        {!isLoading && employees.length === 0 ? (
          <EmptyState>Nenhum funcionário cadastrado.</EmptyState>
        ) : null}

        {!isLoading && employees.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Nível</th>
                  <th>Cargo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id_funcionario}>
                    <td>{employee.id_funcionario}</td>
                    <td>{employee.nome}</td>
                    <td>{employee.email}</td>
                    <td>{formatAccessLevel(employee.nivel_acesso)}</td>
                    <td>{resolveCargoNameById(cargos, employee.id_cargo)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button-ghost"
                          disabled={!isManager}
                          onClick={() => {
                            setEditingId(employee.id_funcionario);
                            setForm({
                              nome: employee.nome,
                              email: employee.email,
                              senha: '',
                              nivel_acesso: toAccessLevel(employee.nivel_acesso) ?? 1,
                              id_cargo: employee.id_cargo ? String(employee.id_cargo) : ''
                            });
                            scrollToFormPanel();
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          disabled={!isAdmin}
                          onClick={() => handleDelete(employee.id_funcionario)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
