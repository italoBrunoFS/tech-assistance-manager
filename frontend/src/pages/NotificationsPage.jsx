import { useMemo, useState } from 'react';
import { Panel, InlineMessage } from '../components/Ui';
import { backendApi } from '../services/backendApi';
import { extractApiError } from '../lib/api';
import { toLocalDateTimeInputValue } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { hasManagerAccess } from '../lib/accessLevel';

const initialForm = {
  id_os: '',
  tipo: '',
  data_envio: toLocalDateTimeInputValue(),
  status_envio: 'Pendente',
  canal: 'WhatsApp'
};

export function NotificationsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [lastNotification, setLastNotification] = useState(null);
  const [status, setStatus] = useState({ type: '', text: '' });

  const canCreate = useMemo(
    () => hasManagerAccess(user?.nivel_acesso),
    [user?.nivel_acesso]
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canCreate) {
      setStatus({ type: 'error', text: 'Somente admin ou gerente podem enviar notificações.' });
      return;
    }

    try {
      const response = await backendApi.notification.create({
        ...form,
        id_os: Number(form.id_os),
        data_envio: new Date(form.data_envio).toISOString()
      });

      setLastNotification(response.data);
      setStatus({ type: 'success', text: 'Notificação registrada com sucesso.' });
      setForm(initialForm);
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  return (
    <div className="page-stack">
      <Panel
        title="Notificações manuais"
        subtitle="Cadastro manual em /notification (admin/gerente)"
      >
        <InlineMessage type={canCreate ? 'success' : 'info'}>
          {canCreate
            ? 'Seu perfil pode criar notificações manuais.'
            : 'Seu perfil só pode visualizar esta tela.'}
        </InlineMessage>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            ID da OS
            <input
              type="number"
              min="1"
              value={form.id_os}
              onChange={(event) => setForm((value) => ({ ...value, id_os: event.target.value }))}
              disabled={!canCreate}
              required
            />
          </label>

          <label>
            Tipo
            <input
              type="text"
              value={form.tipo}
              onChange={(event) => setForm((value) => ({ ...value, tipo: event.target.value }))}
              disabled={!canCreate}
              placeholder="Ex: Mudanca de status para Aguardando Peca"
              required
            />
          </label>

          <label>
            Data de envio
            <input
              type="datetime-local"
              value={form.data_envio}
              onChange={(event) =>
                setForm((value) => ({ ...value, data_envio: event.target.value }))
              }
              disabled={!canCreate}
              required
            />
          </label>

          <label>
            Status de envio
            <select
              value={form.status_envio}
              onChange={(event) =>
                setForm((value) => ({ ...value, status_envio: event.target.value }))
              }
              disabled={!canCreate}
            >
              <option value="Pendente">Pendente</option>
              <option value="Enviado">Enviado</option>
              <option value="Falha">Falha</option>
            </select>
          </label>

          <label>
            Canal
            <select
              value={form.canal}
              onChange={(event) => setForm((value) => ({ ...value, canal: event.target.value }))}
              disabled={!canCreate}
            >
              <option value="WhatsApp">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="Email">Email</option>
            </select>
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={!canCreate}>
              Registrar notificação
            </button>
          </div>
        </form>

        <InlineMessage type={status.type}>{status.text}</InlineMessage>

        {lastNotification ? (
          <div className="json-preview">
            <strong>Última notificação criada</strong>
            <pre>{JSON.stringify(lastNotification, null, 2)}</pre>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
