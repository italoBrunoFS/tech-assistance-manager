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
  'Aguardando Peca',
  'Concluido'
];
const LEGACY_STATUS_ALIASES = {
  'em analise tecnica': 'Em Analise',
  'em conserto': 'Aguardando Peca',
  concluida: 'Concluido'
};

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
Object.entries(LEGACY_STATUS_ALIASES).forEach(([legacyStatus, canonicalStatus]) => {
  STATUS_CANONICAL_MAP[legacyStatus] = canonicalStatus;
});

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
const initialOrderFilters = {
  id_os: '',
  status_os: '',
  id_equipamento: '',
  id_funcionario: '',
  descricao_problema: '',
  serial: '',
  cliente_nome: '',
  data_from: '',
  data_to: ''
};

export function OrdersPage() {
  const statusOptions = [
    { value: 'Aberto', label: 'Aberto' },
    { value: 'Em Analise', label: 'Em Analise' },
    { value: 'Aguardando Peca', label: 'Aguardando Peca' },
    { value: 'Concluido', label: 'Concluido' }
  ];

  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [intakePhotoFile, setIntakePhotoFile] = useState(null);
  const [orderFilters, setOrderFilters] = useState(initialOrderFilters);
  const [statusByOrder, setStatusByOrder] = useState({});
  const [laborByOrder, setLaborByOrder] = useState({});
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

  function applyOrdersList(ordersList) {
    setOrders(ordersList);
    setStatusByOrder(
      ordersList.reduce((accumulator, order) => {
        accumulator[order.id_os] = toCanonicalStatus(order.status_os) || order.status_os;
        return accumulator;
      }, {})
    );
    setLaborByOrder(
      ordersList.reduce((accumulator, order) => {
        accumulator[order.id_os] =
          order.valor_mao_obra === null || order.valor_mao_obra === undefined
            ? ''
            : String(order.valor_mao_obra);
        return accumulator;
      }, {})
    );
  }

  function buildOrderSearchParams() {
    const params = {};

    if (orderFilters.id_os.trim()) params.id_os = orderFilters.id_os.trim();
    if (orderFilters.status_os) params.status_os = orderFilters.status_os;
    if (orderFilters.id_equipamento.trim()) params.id_equipamento = orderFilters.id_equipamento.trim();
    if (orderFilters.id_funcionario.trim()) params.id_funcionario = orderFilters.id_funcionario.trim();
    if (orderFilters.descricao_problema.trim()) params.descricao_problema = orderFilters.descricao_problema.trim();
    if (orderFilters.serial.trim()) params.serial = orderFilters.serial.trim();
    if (orderFilters.cliente_nome.trim()) params.cliente_nome = orderFilters.cliente_nome.trim();
    if (orderFilters.data_from) params.data_from = new Date(orderFilters.data_from).toISOString();
    if (orderFilters.data_to) params.data_to = new Date(orderFilters.data_to).toISOString();

    return params;
  }

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
      setEmployees(employeesResponse.data || []);
      setEquipments(equipmentResponse.data || []);
      applyOrdersList(ordersList);
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearchOrders() {
    setStatus({ type: '', text: '' });
    setIsLoading(true);

    try {
      const params = buildOrderSearchParams();
      const response = await backendApi.os.search(params);
      const ordersList = response.data || [];
      applyOrdersList(ordersList);
      setStatus({
        type: 'success',
        text: `${ordersList.length} OS encontrada(s) pelos filtros.`
      });
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearOrderFilters() {
    setOrderFilters(initialOrderFilters);
    await loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setStatus({ type: '', text: '' });

    try {
      const response = await backendApi.os.create({
        ...form,
        id_funcionario: Number(form.id_funcionario),
        id_equipamento: Number(form.id_equipamento),
        data_abertura: new Date(form.data_abertura).toISOString()
      });

      const createdOrderId = Number(response.data?.id_os);
      let uploadWarning = '';

      if (intakePhotoFile) {
        if (Number.isInteger(createdOrderId) && createdOrderId > 0) {
          const photoPayload = new FormData();
          photoPayload.append('id_os', String(createdOrderId));
          photoPayload.append('photo', intakePhotoFile);

          try {
            await backendApi.photo.upload(photoPayload);
          } catch (uploadError) {
            uploadWarning = ` OS criada, mas a foto de entrada nao foi enviada: ${extractApiError(uploadError)}`;
          }
        } else {
          uploadWarning = ' OS criada, mas nao foi possivel identificar o ID para anexar a foto de entrada.';
        }
      }

      setForm(initialForm);
      setIntakePhotoFile(null);
      setStatus({
        type: uploadWarning ? 'info' : 'success',
        text: `OS criada com sucesso.${uploadWarning}`
      });
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handlePatchStatus(orderId) {
    const nextStatus = statusByOrder[orderId];
    const canonicalStatus = toCanonicalStatus(nextStatus);
    const currentOrder = orders.find((order) => Number(order.id_os) === Number(orderId));
    const currentCanonicalStatus = toCanonicalStatus(currentOrder?.status_os) || currentOrder?.status_os;
    const rawLaborValue = laborByOrder[orderId];
    const hasLaborValue = String(rawLaborValue ?? '').trim() !== '';

    if (!canonicalStatus) {
      setStatus({
        type: 'error',
        text: `Selecione um status valido para atualizar a OS #${orderId}.`
      });
      return;
    }

    if (!currentOrder) {
      setStatus({
        type: 'error',
        text: `OS #${orderId} nao encontrada na lista atual.`
      });
      return;
    }

    const statusChanged = canonicalStatus !== currentCanonicalStatus;
    let laborUpdated = false;
    let updatedTotal = currentOrder.valor_total;
    let notificationStatus = null;

    try {
      if (hasLaborValue) {
        const laborValue = Number(rawLaborValue);

        if (!Number.isFinite(laborValue) || laborValue < 0) {
          setStatus({
            type: 'error',
            text: `Informe um valor de mao de obra valido para a OS #${orderId}.`
          });
          return;
        }

        const currentLaborValue = Number(currentOrder.valor_mao_obra);
        const hasCurrentLaborValue =
          currentOrder.valor_mao_obra !== null &&
          currentOrder.valor_mao_obra !== undefined &&
          String(currentOrder.valor_mao_obra).trim() !== '';
        const laborChanged =
          !hasCurrentLaborValue || Math.abs(laborValue - currentLaborValue) > 0.000001;

        if (laborChanged) {
          const laborResponse = await backendApi.os.patchLabor(orderId, {
            valor_mao_obra: laborValue
          });
          laborUpdated = true;
          updatedTotal = laborResponse.data?.data?.valor_total ?? updatedTotal;
        }
      }

      if (statusChanged) {
        const response = await backendApi.os.patchStatus(orderId, {
          status_os: canonicalStatus
        });
        notificationStatus = response.data?.notification?.status || 'sem retorno';
      }

      if (!laborUpdated && !statusChanged) {
        setStatus({
          type: 'info',
          text: `Nenhuma alteracao detectada para a OS #${orderId}.`
        });
        return;
      }

      let successMessage = `OS #${orderId} atualizada com sucesso.`;

      if (laborUpdated) {
        successMessage +=
          updatedTotal === null || updatedTotal === undefined
            ? ' Mao de obra atualizada.'
            : ` Mao de obra atualizada. Total da OS: ${formatCurrency(updatedTotal)}.`;
      }

      if (statusChanged) {
        successMessage += ` Status atualizado. Notificacao: ${notificationStatus}.`;
      }

      setStatus({
        type: 'success',
        text: successMessage
      });
      await loadData();
      return;
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

          <label className="field-full">
            Foto de entrada (opcional)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              capture="environment"
              onChange={(event) => setIntakePhotoFile(event.target.files?.[0] || null)}
            />
            <small>
              {intakePhotoFile
                ? `Arquivo selecionado: ${intakePhotoFile.name}`
                : 'Nenhum arquivo selecionado.'}
            </small>
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

        <div className="form-grid">
          <label>
            ID da OS
            <input
              type="number"
              min="1"
              value={orderFilters.id_os}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, id_os: event.target.value }))
              }
              placeholder="Ex: 12"
            />
          </label>

          <label>
            Status
            <select
              value={orderFilters.status_os}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, status_os: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {statusOptions.map((statusOption) => (
                <option key={`filter-${statusOption.value}`} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            ID do equipamento
            <input
              type="number"
              min="1"
              value={orderFilters.id_equipamento}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, id_equipamento: event.target.value }))
              }
              placeholder="Ex: 3"
            />
          </label>

          <label>
            ID do funcionario
            <input
              type="number"
              min="1"
              value={orderFilters.id_funcionario}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, id_funcionario: event.target.value }))
              }
              placeholder="Ex: 2"
            />
          </label>

          <label className="field-full">
            Problema (descricao)
            <input
              type="text"
              value={orderFilters.descricao_problema}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, descricao_problema: event.target.value }))
              }
              placeholder="Ex: tela quebrada"
            />
          </label>

          <label>
            Serial do equipamento
            <input
              type="text"
              value={orderFilters.serial}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, serial: event.target.value }))
              }
              placeholder="Ex: MOTOG84-PA-0001"
            />
          </label>

          <label>
            Nome do cliente
            <input
              type="text"
              value={orderFilters.cliente_nome}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, cliente_nome: event.target.value }))
              }
              placeholder="Ex: Mariana"
            />
          </label>

          <label>
            Abertura de
            <input
              type="datetime-local"
              value={orderFilters.data_from}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, data_from: event.target.value }))
              }
            />
          </label>

          <label>
            Abertura ate
            <input
              type="datetime-local"
              value={orderFilters.data_to}
              onChange={(event) =>
                setOrderFilters((value) => ({ ...value, data_to: event.target.value }))
              }
            />
          </label>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={handleSearchOrders}>
              Filtrar ordens
            </button>
            <button type="button" className="button button-ghost" onClick={handleClearOrderFilters}>
              Limpar filtros
            </button>
          </div>
        </div>

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
                  <th>Func.</th>
                  <th>Mao de obra</th>
                  <th>Total</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => {
                  const selectedStatus = statusByOrder[order.id_os] || order.status_os;
                  const normalizedSelectedStatus = normalizeStatusValue(selectedStatus);
                  const isSupportedStatus = Boolean(STATUS_CANONICAL_MAP[normalizedSelectedStatus]);
                  const isLockedOrder = toCanonicalStatus(order.status_os) === 'Concluido';
                  const rowStatusOptions = isSupportedStatus
                    ? statusOptions
                    : [{ value: selectedStatus, label: `${selectedStatus} (legado)` }, ...statusOptions];

                  return (
                    <tr key={order.id_os}>
                      <td>#{order.id_os}</td>
                      <td>
                        <select
                          value={selectedStatus}
                          disabled={isLockedOrder}
                          onChange={(event) =>
                            setStatusByOrder((current) => ({
                              ...current,
                              [order.id_os]: event.target.value
                            }))
                          }
                        >
                          {rowStatusOptions.map((statusOption) => (
                            <option key={`${order.id_os}-${statusOption.value}`} value={statusOption.value}>
                              {statusOption.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    <td>{formatDate(order.data_abertura)}</td>
                    <td>{order.id_equipamento}</td>
                    <td>{order.id_funcionario ?? '-'}</td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={laborByOrder[order.id_os] ?? ''}
                        disabled={isLockedOrder}
                        onChange={(event) =>
                          setLaborByOrder((current) => ({
                            ...current,
                            [order.id_os]: event.target.value
                          }))
                        }
                      />
                    </td>
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
                          disabled={isLockedOrder}
                          title={isLockedOrder ? 'OS concluida nao pode ser alterada' : ''}
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
                  );
                })}
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
