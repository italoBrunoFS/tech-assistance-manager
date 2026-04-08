import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, EmptyState, InlineMessage } from '../components/Ui';
import { backendApi } from '../services/backendApi';
import { extractApiError } from '../lib/api';
import { formatCurrency } from '../lib/format';

const initialForm = {
  nome_peca: '',
  preco_unit: '',
  estoque: ''
};
const initialUsageForm = {
  id_os: '',
  id_peca: '',
  quantidade: '1',
  preco_unitario_cobrado: ''
};

export function PartsPage() {
  const [parts, setParts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [usageForm, setUsageForm] = useState(initialUsageForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const formPanelRef = useRef(null);
  const sortedParts = useMemo(
    () => [...parts].sort((left, right) => Number(left.id_peca) - Number(right.id_peca)),
    [parts]
  );
  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => Number(right.id_os) - Number(left.id_os)),
    [orders]
  );
  const canAttachPart = sortedParts.length > 0 && sortedOrders.length > 0;

  async function loadData() {
    setIsLoading(true);
    try {
      const [partsResponse, ordersResponse] = await Promise.all([
        backendApi.part.list(),
        backendApi.os.list()
      ]);
      setParts(partsResponse.data || []);
      setOrders(ordersResponse.data || []);
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

  function resetUsageForm() {
    setUsageForm(initialUsageForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const payload = {
        nome_peca: form.nome_peca,
        preco_unit: Number(form.preco_unit),
        estoque: Number(form.estoque)
      };

      if (editingId) {
        await backendApi.part.update(editingId, payload);
        setStatus({ type: 'success', text: 'Peça atualizada com sucesso.' });
      } else {
        await backendApi.part.create(payload);
        setStatus({ type: 'success', text: 'Peça cadastrada com sucesso.' });
      }

      resetForm();
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleDelete(partId) {
    if (!window.confirm('Deseja excluir esta peça?')) {
      return;
    }

    try {
      await backendApi.part.remove(partId);
      setStatus({ type: 'success', text: 'Peça removida com sucesso.' });
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleAttachPart(event) {
    event.preventDefault();

    if (!canAttachPart) {
      setStatus({
        type: 'error',
        text: 'Cadastre pelo menos uma peca e uma OS para vincular.'
      });
      return;
    }

    const idOs = Number(usageForm.id_os);
    const idPeca = Number(usageForm.id_peca);
    const quantidade = Number(usageForm.quantidade);
    const hasCustomPrice = String(usageForm.preco_unitario_cobrado || '').trim() !== '';
    const customPrice = hasCustomPrice ? Number(usageForm.preco_unitario_cobrado) : null;

    if (!Number.isInteger(idOs) || idOs <= 0) {
      setStatus({ type: 'error', text: 'Selecione uma OS valida.' });
      return;
    }

    if (!Number.isInteger(idPeca) || idPeca <= 0) {
      setStatus({ type: 'error', text: 'Selecione uma peca valida.' });
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setStatus({ type: 'error', text: 'Informe uma quantidade valida.' });
      return;
    }

    if (hasCustomPrice && (!Number.isFinite(customPrice) || customPrice < 0)) {
      setStatus({ type: 'error', text: 'Informe um preco unitario cobrado valido.' });
      return;
    }

    try {
      const payload = {
        id_peca: idPeca,
        quantidade
      };

      if (hasCustomPrice) {
        payload.preco_unitario_cobrado = customPrice;
      }

      const response = await backendApi.os.addPart(idOs, payload);
      const updatedTotal = response.data?.os?.valor_total;
      const totalText =
        updatedTotal === null || updatedTotal === undefined
          ? ''
          : ` Total da OS: ${formatCurrency(updatedTotal)}.`;

      setStatus({
        type: 'success',
        text: `Peca vinculada a OS #${idOs} com sucesso.${totalText}`
      });
      resetUsageForm();
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  return (
    <div className="page-stack">
      <InlineMessage type={status.type}>{status.text}</InlineMessage>

      <Panel
        title="Vincular peca a OS"
        subtitle="Registre a peca utilizada e deixe o valor total ser recalculado automaticamente"
      >
        <form className="form-grid" onSubmit={handleAttachPart}>
          <label>
            Ordem de servico
            <select
              value={usageForm.id_os}
              onChange={(event) =>
                setUsageForm((value) => ({ ...value, id_os: event.target.value }))
              }
              required
            >
              <option value="">Selecione</option>
              {sortedOrders.map((order) => (
                <option key={`order-${order.id_os}`} value={order.id_os}>
                  #{order.id_os} - {order.status_os}
                </option>
              ))}
            </select>
          </label>

          <label>
            Peca
            <select
              value={usageForm.id_peca}
              onChange={(event) =>
                setUsageForm((value) => ({ ...value, id_peca: event.target.value }))
              }
              required
            >
              <option value="">Selecione</option>
              {sortedParts.map((part) => (
                <option key={`part-${part.id_peca}`} value={part.id_peca}>
                  #{part.id_peca} - {part.nome_peca}
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantidade
            <input
              type="number"
              min="1"
              step="1"
              value={usageForm.quantidade}
              onChange={(event) =>
                setUsageForm((value) => ({ ...value, quantidade: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Preco unitario cobrado (opcional)
            <input
              type="number"
              step="0.01"
              min="0"
              value={usageForm.preco_unitario_cobrado}
              onChange={(event) =>
                setUsageForm((value) => ({
                  ...value,
                  preco_unitario_cobrado: event.target.value
                }))
              }
              placeholder="Se vazio, usa preco da peca"
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={!canAttachPart}>
              Adicionar peca na OS
            </button>
            <button type="button" className="button button-ghost" onClick={resetUsageForm}>
              Limpar
            </button>
          </div>
        </form>

        {!isLoading && !canAttachPart ? (
          <EmptyState>Cadastre pelo menos uma peca e uma OS para habilitar este formulario.</EmptyState>
        ) : null}
      </Panel>
      <Panel title="Cadastro de peças" subtitle="Controle de estoque e preço unitário">
        <form ref={formPanelRef} className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nome da peça
            <input
              type="text"
              value={form.nome_peca}
              onChange={(event) =>
                setForm((value) => ({ ...value, nome_peca: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Preço unitário
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.preco_unit}
              onChange={(event) =>
                setForm((value) => ({ ...value, preco_unit: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Estoque
            <input
              type="number"
              min="0"
              value={form.estoque}
              onChange={(event) =>
                setForm((value) => ({ ...value, estoque: event.target.value }))
              }
              required
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              {editingId ? 'Atualizar peça' : 'Cadastrar peça'}
            </button>
            <button type="button" className="button button-ghost" onClick={resetForm}>
              Limpar
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Peças cadastradas" subtitle="Inventário integrado com /part">

        {isLoading ? <p>Carregando peças...</p> : null}

        {!isLoading && sortedParts.length === 0 ? (
          <EmptyState>Nenhuma peça cadastrada.</EmptyState>
        ) : null}

        {!isLoading && sortedParts.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Preço unit.</th>
                  <th>Estoque</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedParts.map((part) => (
                  <tr key={part.id_peca}>
                    <td>{part.id_peca}</td>
                    <td>{part.nome_peca}</td>
                    <td>{formatCurrency(part.preco_unit)}</td>
                    <td>{part.estoque}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => {
                            setEditingId(part.id_peca);
                            setForm({
                              nome_peca: part.nome_peca ?? '',
                              preco_unit: String(part.preco_unit ?? ''),
                              estoque: String(part.estoque ?? '')
                            });
                            scrollToFormPanel();
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => handleDelete(part.id_peca)}
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
