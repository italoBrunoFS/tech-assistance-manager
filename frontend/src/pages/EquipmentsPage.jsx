import { useEffect, useRef, useState } from 'react';
import { Panel, EmptyState, InlineMessage } from '../components/Ui';
import { backendApi } from '../services/backendApi';
import { extractApiError } from '../lib/api';
import { formatDate } from '../lib/format';

const initialForm = {
  tipo: '',
  marca: '',
  modelo: '',
  serial: '',
  id_cliente: ''
};
const initialEquipmentFilters = {
  id_equipamento: '',
  id_cliente: '',
  tipo: '',
  marca: '',
  modelo: '',
  serial: ''
};

export function EquipmentsPage() {
  const [equipments, setEquipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historySerial, setHistorySerial] = useState('');
  const [equipmentFilters, setEquipmentFilters] = useState(initialEquipmentFilters);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const formPanelRef = useRef(null);

  async function loadData() {
    setIsLoading(true);

    try {
      const [equipmentResponse, clientsResponse] = await Promise.all([
        backendApi.equipment.list(),
        backendApi.clients.list()
      ]);

      setEquipments(equipmentResponse.data);
      setClients(clientsResponse.data);
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
    setStatus({ type: '', text: '' });

    try {
      const payload = {
        ...form,
        id_cliente: Number(form.id_cliente)
      };

      if (editingId) {
        await backendApi.equipment.update(editingId, payload);
        setStatus({ type: 'success', text: 'Equipamento atualizado com sucesso.' });
      } else {
        await backendApi.equipment.create(payload);
        setStatus({ type: 'success', text: 'Equipamento cadastrado com sucesso.' });
      }

      resetForm();
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este equipamento?')) {
      return;
    }

    try {
      await backendApi.equipment.remove(id);
      setStatus({ type: 'success', text: 'Equipamento removido.' });
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleHistoryByEquipment(id) {
    try {
      const response = await backendApi.equipment.historyById(id);
      setHistoryRows(response.data.history || []);
      setStatus({ type: 'success', text: `Histórico carregado para equipamento #${id}.` });
    } catch (error) {
      setHistoryRows([]);
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleHistoryBySerial() {
    if (!historySerial.trim()) {
      setHistoryRows([]);
      return;
    }

    try {
      const response = await backendApi.equipment.historyBySerial(historySerial.trim());
      setHistoryRows(response.data.history || []);
      setStatus({ type: 'success', text: 'Histórico por serial carregado.' });
    } catch (error) {
      setHistoryRows([]);
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleSearchEquipments() {
    setStatus({ type: '', text: '' });
    setIsLoading(true);

    try {
      const params = {};
      if (equipmentFilters.id_equipamento.trim()) params.id_equipamento = equipmentFilters.id_equipamento.trim();
      if (equipmentFilters.id_cliente.trim()) params.id_cliente = equipmentFilters.id_cliente.trim();
      if (equipmentFilters.tipo.trim()) params.tipo = equipmentFilters.tipo.trim();
      if (equipmentFilters.marca.trim()) params.marca = equipmentFilters.marca.trim();
      if (equipmentFilters.modelo.trim()) params.modelo = equipmentFilters.modelo.trim();
      if (equipmentFilters.serial.trim()) params.serial = equipmentFilters.serial.trim();

      const response = await backendApi.equipment.search(params);
      const list = response.data || [];
      setEquipments(list);
      setStatus({
        type: 'success',
        text: `${list.length} equipamento(s) encontrado(s) pelos filtros.`
      });
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearEquipmentFilters() {
    setEquipmentFilters(initialEquipmentFilters);
    await loadData();
  }

  return (
    <div className="page-stack">
      <div ref={formPanelRef}>
      <Panel title="Cadastro de equipamentos" subtitle="Vincule equipamento ao cliente">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Tipo
            <input
              type="text"
              value={form.tipo}
              onChange={(event) => setForm((value) => ({ ...value, tipo: event.target.value }))}
              required
            />
          </label>

          <label>
            Marca
            <input
              type="text"
              value={form.marca}
              onChange={(event) => setForm((value) => ({ ...value, marca: event.target.value }))}
              required
            />
          </label>

          <label>
            Modelo
            <input
              type="text"
              value={form.modelo}
              onChange={(event) => setForm((value) => ({ ...value, modelo: event.target.value }))}
              required
            />
          </label>

          <label>
            Serial
            <input
              type="text"
              value={form.serial}
              onChange={(event) => setForm((value) => ({ ...value, serial: event.target.value }))}
              required
            />
          </label>

          <label className="field-full">
            Cliente
            <select
              value={form.id_cliente}
              onChange={(event) =>
                setForm((value) => ({ ...value, id_cliente: event.target.value }))
              }
              required
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id_cliente} value={client.id_cliente}>
                  #{client.id_cliente} - {client.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              {editingId ? 'Atualizar equipamento' : 'Cadastrar equipamento'}
            </button>
            <button type="button" className="button button-ghost" onClick={resetForm}>
              Limpar
            </button>
          </div>
        </form>
      </Panel>
      </div>

      <Panel
        title="Busca de histórico"
        subtitle="Consulta por serial para rastrear atendimentos anteriores"
      >
        <div className="inline-form">
          <input
            type="text"
            value={historySerial}
            onChange={(event) => setHistorySerial(event.target.value)}
            placeholder="Digite o serial"
          />
          <button type="button" className="button button-secondary" onClick={handleHistoryBySerial}>
            Buscar serial
          </button>
        </div>

        {historyRows.length === 0 ? (
          <EmptyState>Sem histórico carregado no momento.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID OS</th>
                  <th>Status</th>
                  <th>Abertura</th>
                  <th>Problema</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr key={row.id_os}>
                    <td>{row.id_os}</td>
                    <td>{row.status_os}</td>
                    <td>{formatDate(row.data_abertura)}</td>
                    <td>{row.descricao_problema}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Equipamentos cadastrados" subtitle="Lista geral integrada com API">
        <InlineMessage type={status.type}>{status.text}</InlineMessage>

        <div className="form-grid">
          <label>
            ID do equipamento
            <input
              type="number"
              min="1"
              value={equipmentFilters.id_equipamento}
              onChange={(event) =>
                setEquipmentFilters((value) => ({ ...value, id_equipamento: event.target.value }))
              }
              placeholder="Ex: 3"
            />
          </label>

          <label>
            ID do cliente
            <input
              type="number"
              min="1"
              value={equipmentFilters.id_cliente}
              onChange={(event) =>
                setEquipmentFilters((value) => ({ ...value, id_cliente: event.target.value }))
              }
              placeholder="Ex: 1"
            />
          </label>

          <label>
            Tipo
            <input
              type="text"
              value={equipmentFilters.tipo}
              onChange={(event) =>
                setEquipmentFilters((value) => ({ ...value, tipo: event.target.value }))
              }
              placeholder="Ex: smartphone"
            />
          </label>

          <label>
            Marca
            <input
              type="text"
              value={equipmentFilters.marca}
              onChange={(event) =>
                setEquipmentFilters((value) => ({ ...value, marca: event.target.value }))
              }
              placeholder="Ex: samsung"
            />
          </label>

          <label>
            Modelo
            <input
              type="text"
              value={equipmentFilters.modelo}
              onChange={(event) =>
                setEquipmentFilters((value) => ({ ...value, modelo: event.target.value }))
              }
              placeholder="Ex: s21"
            />
          </label>

          <label>
            Serial
            <input
              type="text"
              value={equipmentFilters.serial}
              onChange={(event) =>
                setEquipmentFilters((value) => ({ ...value, serial: event.target.value }))
              }
              placeholder="Ex: MOTOG84-PA-0001"
            />
          </label>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={handleSearchEquipments}>
              Filtrar equipamentos
            </button>
            <button type="button" className="button button-ghost" onClick={handleClearEquipmentFilters}>
              Limpar filtros
            </button>
          </div>
        </div>

        {isLoading ? <p>Carregando equipamentos...</p> : null}

        {!isLoading && equipments.length === 0 ? (
          <EmptyState>Nenhum equipamento encontrado.</EmptyState>
        ) : null}

        {!isLoading && equipments.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Serial</th>
                  <th>Cliente</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {equipments.map((equipment) => (
                  <tr key={equipment.id_equipamento}>
                    <td>{equipment.id_equipamento}</td>
                    <td>{equipment.tipo}</td>
                    <td>{equipment.marca}</td>
                    <td>{equipment.modelo}</td>
                    <td>{equipment.serial}</td>
                    <td>{equipment.id_cliente}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => {
                            setEditingId(equipment.id_equipamento);
                            setForm({
                              tipo: equipment.tipo ?? '',
                              marca: equipment.marca ?? '',
                              modelo: equipment.modelo ?? '',
                              serial: equipment.serial ?? '',
                              id_cliente: String(equipment.id_cliente ?? '')
                            });
                            scrollToFormPanel();
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleHistoryByEquipment(equipment.id_equipamento)}
                        >
                          Histórico
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => handleDelete(equipment.id_equipamento)}
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
