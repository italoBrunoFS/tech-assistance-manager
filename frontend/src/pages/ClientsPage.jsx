import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, EmptyState, InlineMessage } from '../components/Ui';
import { backendApi } from '../services/backendApi';
import { extractApiError } from '../lib/api';

const initialForm = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  rua: '',
  bairro: '',
  numero: '',
  cep: '',
  complemento: ''
};

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 4) return `(${areaCode}) ${rest}`;

  if (rest.length <= 8) {
    return `(${areaCode}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `(${areaCode}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeClientPayload(form) {
  return {
    ...form,
    cpf: formatCpf(form.cpf),
    telefone: formatPhone(form.telefone),
    cep: formatCep(form.cep)
  };
}

export function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [queryName, setQueryName] = useState('');
  const [queryPhone, setQueryPhone] = useState('');
  const [queryEmail, setQueryEmail] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const formPanelRef = useRef(null);

  const submitLabel = useMemo(
    () => (editingId ? 'Salvar alterações' : 'Cadastrar cliente'),
    [editingId]
  );

  async function loadClients() {
    setIsLoading(true);
    try {
      const response = await backendApi.clients.list();
      setClients(response.data);
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
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
    setStatus({ type: '', text: '' });
    const payload = normalizeClientPayload(form);

    try {
      if (editingId) {
        await backendApi.clients.update(editingId, payload);
        setStatus({ type: 'success', text: 'Cliente atualizado com sucesso.' });
      } else {
        await backendApi.clients.create(payload);
        setStatus({ type: 'success', text: 'Cliente criado com sucesso.' });
      }

      resetForm();
      await loadClients();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleDelete(clientId) {
    const confirmed = window.confirm('Deseja remover este cliente?');

    if (!confirmed) {
      return;
    }

    try {
      await backendApi.clients.remove(clientId);
      setStatus({ type: 'success', text: 'Cliente removido com sucesso.' });
      await loadClients();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleSearchByName() {
    if (!queryName.trim()) {
      await loadClients();
      return;
    }

    try {
      const response = await backendApi.clients.searchByName(queryName.trim());
      setClients(Array.isArray(response.data) ? response.data : [response.data]);
      setStatus({ type: 'success', text: 'Busca por nome concluída.' });
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
      setClients([]);
    }
  }

  async function handleSearchByPhone() {
    const formattedPhone = formatPhone(queryPhone);

    if (!formattedPhone) {
      await loadClients();
      return;
    }

    try {
      const response = await backendApi.clients.searchByPhone(formattedPhone);
      setClients(
        Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
      );
      setStatus({ type: 'success', text: 'Busca por telefone concluída.' });
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
      setClients([]);
    }
  }

  async function handleSearchByEmail() {
    if (!queryEmail.trim()) {
      await loadClients();
      return;
    }

    try {
      const response = await backendApi.clients.searchByEmail(queryEmail.trim());
      setClients(response.data ? [response.data] : []);
      setStatus({ type: 'success', text: 'Busca por email concluída.' });
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
      setClients([]);
    }
  }

  async function handleClearSearch() {
    setQueryName('');
    setQueryPhone('');
    setQueryEmail('');
    await loadClients();
  }

  return (
    <div className="page-stack">
      <div ref={formPanelRef}>
      <Panel
        title="Cadastro de clientes"
        subtitle="Criação e edição completa de dados cadastrais"
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              type="text"
              value={form.nome}
              onChange={(event) => setForm((value) => ({ ...value, nome: event.target.value }))}
              required
            />
          </label>

          <label>
            CPF
            <input
              type="text"
              value={form.cpf}
              onChange={(event) =>
                setForm((value) => ({ ...value, cpf: formatCpf(event.target.value) }))
              }
              inputMode="numeric"
              maxLength={14}
              placeholder="193.574.826-41"
              required
            />
          </label>

          <label>
            Telefone
            <input
              type="text"
              value={form.telefone}
              onChange={(event) =>
                setForm((value) => ({ ...value, telefone: formatPhone(event.target.value) }))
              }
              inputMode="numeric"
              maxLength={15}
              placeholder="(11) 98765-2143"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
              required
            />
          </label>

          <label>
            Rua
            <input
              type="text"
              value={form.rua}
              onChange={(event) => setForm((value) => ({ ...value, rua: event.target.value }))}
              required
            />
          </label>

          <label>
            Bairro
            <input
              type="text"
              value={form.bairro}
              onChange={(event) => setForm((value) => ({ ...value, bairro: event.target.value }))}
              required
            />
          </label>

          <label>
            Número
            <input
              type="text"
              value={form.numero}
              onChange={(event) => setForm((value) => ({ ...value, numero: event.target.value }))}
              required
            />
          </label>

          <label>
            CEP
            <input
              type="text"
              value={form.cep}
              onChange={(event) =>
                setForm((value) => ({ ...value, cep: formatCep(event.target.value) }))
              }
              inputMode="numeric"
              maxLength={9}
              placeholder="69005-120"
              required
            />
          </label>

          <label className="field-full">
            Complemento
            <input
              type="text"
              value={form.complemento}
              onChange={(event) =>
                setForm((value) => ({ ...value, complemento: event.target.value }))
              }
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              {submitLabel}
            </button>
            <button type="button" className="button button-ghost" onClick={resetForm}>
              Limpar
            </button>
          </div>
        </form>
      </Panel>
      </div>

      <Panel
        title="Busca rápida"
        subtitle="Pesquise por nome, telefone ou email"
      >
        <div className="quick-search-grid">
          <div className="quick-search-row">
            <label>
              Nome
              <input
                type="text"
                value={queryName}
                onChange={(event) => setQueryName(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button button-secondary quick-search-button"
              onClick={handleSearchByName}
            >
              Buscar nome
            </button>
          </div>

          <div className="quick-search-row">
            <label>
              Telefone
              <input
                type="text"
                value={queryPhone}
                onChange={(event) => setQueryPhone(formatPhone(event.target.value))}
                inputMode="numeric"
                maxLength={15}
              />
            </label>
            <button
              type="button"
              className="button button-secondary quick-search-button"
              onClick={handleSearchByPhone}
            >
              Buscar telefone
            </button>
          </div>

          <div className="quick-search-row">
            <label>
              Email
              <input
                type="email"
                value={queryEmail}
                onChange={(event) => setQueryEmail(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button button-secondary quick-search-button"
              onClick={handleSearchByEmail}
            >
              Buscar email
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={handleClearSearch}>
              Limpar busca
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Clientes cadastrados" subtitle="Dados vindos diretamente da API">
        <InlineMessage type={status.type}>{status.text}</InlineMessage>

        {isLoading ? <p>Carregando clientes...</p> : null}

        {!isLoading && clients.length === 0 ? (
          <EmptyState>Nenhum cliente encontrado para o filtro atual.</EmptyState>
        ) : null}

        {!isLoading && clients.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Email</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id_cliente}>
                    <td>{client.id_cliente}</td>
                    <td>{client.nome}</td>
                    <td>{formatPhone(client.telefone)}</td>
                    <td>{client.email}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => {
                            setEditingId(client.id_cliente);
                            setForm({
                              nome: client.nome ?? '',
                              cpf: formatCpf(client.cpf ?? ''),
                              telefone: formatPhone(client.telefone ?? ''),
                              email: client.email ?? '',
                              rua: client.rua ?? '',
                              bairro: client.bairro ?? '',
                              numero: client.numero ?? '',
                              cep: formatCep(client.cep ?? ''),
                              complemento: client.complemento ?? ''
                            });
                            scrollToFormPanel();
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => handleDelete(client.id_cliente)}
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
