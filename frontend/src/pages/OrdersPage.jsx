import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Panel, EmptyState, InlineMessage } from '../components/Ui';
import { backendApi } from '../services/backendApi';
import { extractApiError } from '../lib/api';
import { formatCurrency, formatDate, toLocalDateTimeInputValue } from '../lib/format';

const STATUS_OPTIONS = [
  'Aberto',
  'Em Analise',
  'Em Analise Tecnica',
  'Em Conserto',
  'Concluida',
  'Cancelada'
];

function normalizeStatusValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const STATUS_CANONICAL_MAP = STATUS_OPTIONS.reduce((accumulator, status) => {
  accumulator[normalizeStatusValue(status)] = status;
  return accumulator;
}, {});

function toCanonicalStatus(value) {
  const normalizedValue = normalizeStatusValue(value);
  return STATUS_CANONICAL_MAP[normalizedValue] || null;
}

const initialForm = {
  descricao_problema: '',
  data_abertura: toLocalDateTimeInputValue(),
  status_os: 'Aberto',
  id_funcionario: '',
  id_equipamento: ''
};

export function OrdersPage() {
  const statusOptions = [
    { value: 'Aberto', label: 'Aberto' },
    { value: 'Em Analise', label: 'Em Análise' },
    { value: 'Em Analise Tecnica', label: 'Em Análise Técnica' },
    { value: 'Em Conserto', label: 'Em Conserto' },
    { value: 'Concluida', label: 'Concluída' },
    { value: 'Cancelada', label: 'Cancelada' }
  ];

  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [statusByOrder, setStatusByOrder] = useState({});
  const [qrOrderId, setQrOrderId] = useState(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (left, right) => new Date(right.data_abertura).getTime() - new Date(left.data_abertura).getTime()
      ),
    [orders]
  );

  async function loadData() {
    setIsLoading(true);
    setStatus({ type: '', text: '' });

    try {
      const [ordersResponse, employeesResponse, equipmentResponse] = await Promise.all([
        backendApi.os.list(),
        backendApi.employees.list(),
        backendApi.equipment.list()
      ]);

      const ordersList = ordersResponse.data || [];
      setOrders(ordersList);
      setEmployees(employeesResponse.data || []);
      setEquipments(equipmentResponse.data || []);
      setStatusByOrder(
        ordersList.reduce((accumulator, order) => {
          accumulator[order.id_os] = toCanonicalStatus(order.status_os) || order.status_os;
          return accumulator;
        }, {})
      );
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setStatus({ type: '', text: '' });

    try {
      await backendApi.os.create({
        ...form,
        id_funcionario: Number(form.id_funcionario),
        id_equipamento: Number(form.id_equipamento),
        data_abertura: new Date(form.data_abertura).toISOString()
      });
      setForm(initialForm);
      setStatus({ type: 'success', text: 'OS criada com sucesso.' });
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handlePatchStatus(orderId) {
    const nextStatus = statusByOrder[orderId];
    const canonicalStatus = toCanonicalStatus(nextStatus) || nextStatus;

    if (!canonicalStatus) {
      return;
    }

    try {
      const response = await backendApi.os.patchStatus(orderId, {
        status_os: canonicalStatus
      });
      const notificationStatus = response.data?.notification?.status || 'sem retorno';
      setStatus({
        type: 'success',
        text: `Status da OS #${orderId} atualizado. Notificação: ${notificationStatus}.`
      });
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleOpenPdf(orderId) {
    try {
      const response = await backendApi.os.generatePdf(orderId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  function buildPublicLink(orderId) {
    return `${window.location.origin}/public/os/${orderId}`;
  }

  async function copyPublicLink(orderId) {
    const publicLink = buildPublicLink(orderId);
    await navigator.clipboard.writeText(publicLink);
    setStatus({ type: 'success', text: `Link público da OS #${orderId} copiado.` });
  }

  function handleGenerateQr(orderId) {
    setQrOrderId(orderId);
    setStatus({ type: 'success', text: `QR Code da OS #${orderId} gerado.` });
  }

  return (
    <div className="page-stack">
      <Panel title="Nova ordem de serviço">
        <form className="form-grid" onSubmit={handleCreate}>
          <label className="field-full">
            Descrição do problema
            <textarea
              value={form.descricao_problema}
              onChange={(event) =>
                setForm((value) => ({ ...value, descricao_problema: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Data de abertura
            <input
              type="datetime-local"
              value={form.data_abertura}
              onChange={(event) =>
                setForm((value) => ({ ...value, data_abertura: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Status inicial
            <select
              value={form.status_os}
              onChange={(event) =>
                setForm((value) => ({ ...value, status_os: event.target.value }))
              }
              required
            >
              {statusOptions.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Funcionário responsável
            <select
              value={form.id_funcionario}
              onChange={(event) =>
                setForm((value) => ({ ...value, id_funcionario: event.target.value }))
              }
              required
            >
              <option value="">Selecione</option>
              {employees.map((employee) => (
                <option key={employee.id_funcionario} value={employee.id_funcionario}>
                  #{employee.id_funcionario} - {employee.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            Equipamento
            <select
              value={form.id_equipamento}
              onChange={(event) =>
                setForm((value) => ({ ...value, id_equipamento: event.target.value }))
              }
              required
            >
              <option value="">Selecione</option>
              {equipments.map((equipment) => (
                <option key={equipment.id_equipamento} value={equipment.id_equipamento}>
                  #{equipment.id_equipamento} - {equipment.tipo} {equipment.marca} {equipment.modelo}
                </option>
              ))}
            </select>
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              Criar OS
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Ordens cadastradas">
        <InlineMessage type={status.type}>{status.text}</InlineMessage>

        {isLoading ? <p>Carregando ordens...</p> : null}

        {!isLoading && sortedOrders.length === 0 ? (
          <EmptyState>Nenhuma OS cadastrada.</EmptyState>
        ) : null}

        {!isLoading && sortedOrders.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Abertura</th>
                  <th>Equip.</th>
                  <th>Total</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => (
                  <tr key={order.id_os}>
                    <td>#{order.id_os}</td>
                    <td>
                      <select
                        value={statusByOrder[order.id_os] || order.status_os}
                        onChange={(event) =>
                          setStatusByOrder((current) => ({
                            ...current,
                            [order.id_os]: event.target.value
                          }))
                        }
                      >
                        {statusOptions.map((statusOption) => (
                          <option key={`${order.id_os}-${statusOption.value}`} value={statusOption.value}>
                            {statusOption.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(order.data_abertura)}</td>
                    <td>{order.id_equipamento}</td>
                    <td>
                      <div className="table-total-cell">
                        <strong>
                          {order.valor_total === null || order.valor_total === undefined
                            ? '-'
                            : formatCurrency(order.valor_total)}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handlePatchStatus(order.id_os)}
                        >
                          Atualizar
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => handleOpenPdf(order.id_os)}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => copyPublicLink(order.id_os)}
                        >
                          Copiar link
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => handleGenerateQr(order.id_os)}
                        >
                          Gerar QR
                        </button>
                        <Link to={`/public/os/${order.id_os}`} className="button button-ghost">
                          Público
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {qrOrderId ? (
          <div className="json-preview order-qr-preview">
            <div className="order-qr-header">
              <strong>QR Code da OS #{qrOrderId}</strong>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setQrOrderId(null)}
              >
                Fechar
              </button>
            </div>
            <div className="order-qr-content">
              <div className="qr-wrapper">
                <QRCodeSVG value={buildPublicLink(qrOrderId)} size={180} includeMargin />
              </div>
              <p className="public-link">{buildPublicLink(qrOrderId)}</p>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
