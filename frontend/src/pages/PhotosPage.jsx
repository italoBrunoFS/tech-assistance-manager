import { useEffect, useState } from 'react';
import { Panel, EmptyState, InlineMessage } from '../components/Ui';
import { backendApi } from '../services/backendApi';
import { extractApiError, getAbsoluteFileUrl } from '../lib/api';
import { formatDateTime, toLocalDateTimeInputValue } from '../lib/format';

const initialManualForm = {
  id_os: '',
  url_arquivo: '',
  data_upload: toLocalDateTimeInputValue()
};

export function PhotosPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [photos, setPhotos] = useState([]);
  const [file, setFile] = useState(null);
  const [manualForm, setManualForm] = useState(initialManualForm);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  async function loadOrders() {
    setIsLoading(true);
    try {
      const response = await backendApi.os.list();
      setOrders(response.data || []);
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadPhotosByOrder(orderId) {
    if (!orderId) {
      setPhotos([]);
      return;
    }

    try {
      const response = await backendApi.photo.listByOs(orderId);
      setPhotos(response.data || []);
    } catch (error) {
      setPhotos([]);
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedOrderId) {
      setStatus({ type: 'error', text: 'Selecione uma OS antes de enviar a foto.' });
      return;
    }

    if (!file) {
      setStatus({ type: 'error', text: 'Selecione um arquivo de imagem.' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('id_os', String(selectedOrderId));
      formData.append('photo', file);

      await backendApi.photo.upload(formData);
      setStatus({ type: 'success', text: 'Foto enviada com sucesso.' });
      setFile(null);
      await loadPhotosByOrder(selectedOrderId);
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleManualCreate(event) {
    event.preventDefault();

    try {
      await backendApi.photo.create({
        ...manualForm,
        id_os: Number(manualForm.id_os),
        data_upload: new Date(manualForm.data_upload).toISOString()
      });
      setStatus({ type: 'success', text: 'Registro manual de foto criado.' });
      setManualForm(initialManualForm);
      if (selectedOrderId) {
        await loadPhotosByOrder(selectedOrderId);
      }
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    }
  }

  async function handleDeletePhoto(photoId) {
    const confirmed = window.confirm('Deseja remover esta foto da OS?');
    if (!confirmed) {
      return;
    }

    setStatus({ type: '', text: '' });
    setDeletingPhotoId(photoId);

    try {
      await backendApi.photo.remove(photoId);
      setStatus({ type: 'success', text: `Foto #${photoId} removida com sucesso.` });
      await loadPhotosByOrder(selectedOrderId);
    } catch (error) {
      setStatus({ type: 'error', text: extractApiError(error) });
    } finally {
      setDeletingPhotoId(null);
    }
  }

  return (
    <div className="page-stack">
      <Panel
        title="Registro fotográfico"
        subtitle="Upload real em /photo/upload e cadastro manual em /photo"
      >
        <div className="inline-form">
          <select
            value={selectedOrderId}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedOrderId(value);
              loadPhotosByOrder(value);
            }}
          >
            <option value="">Selecione uma OS</option>
            {orders.map((order) => (
              <option key={order.id_os} value={order.id_os}>
                #{order.id_os} - {order.status_os}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => loadPhotosByOrder(selectedOrderId)}
            disabled={!selectedOrderId}
          >
            Atualizar galeria
          </button>
        </div>
      </Panel>

      <Panel title="Upload de foto" subtitle="Envia imagem para o backend e cria registro">
        <form className="inline-form" onSubmit={handleUpload}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <button type="submit" className="button button-primary">
            Enviar imagem
          </button>
        </form>
      </Panel>

      <Panel title="Cadastro manual por URL" subtitle="Fluxo alternativo para fontes externas">
        <form className="form-grid" onSubmit={handleManualCreate}>
          <label>
            OS
            <select
              value={manualForm.id_os}
              onChange={(event) =>
                setManualForm((value) => ({ ...value, id_os: event.target.value }))
              }
              required
            >
              <option value="">Selecione</option>
              {orders.map((order) => (
                <option key={order.id_os} value={order.id_os}>
                  #{order.id_os}
                </option>
              ))}
            </select>
          </label>

          <label className="field-full">
            URL da imagem
            <input
              type="text"
              value={manualForm.url_arquivo}
              onChange={(event) =>
                setManualForm((value) => ({ ...value, url_arquivo: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Data de upload
            <input
              type="datetime-local"
              value={manualForm.data_upload}
              onChange={(event) =>
                setManualForm((value) => ({ ...value, data_upload: event.target.value }))
              }
              required
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              Salvar registro manual
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Galeria da OS" subtitle="Visualização de fotos registradas">
        <InlineMessage type={status.type}>{status.text}</InlineMessage>

        {isLoading ? <p>Carregando ordens...</p> : null}

        {!isLoading && selectedOrderId && photos.length === 0 ? (
          <EmptyState>Nenhuma foto registrada para esta OS.</EmptyState>
        ) : null}

        {!isLoading && photos.length > 0 ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <figure key={photo.id_foto} className="photo-card">
                <img src={getAbsoluteFileUrl(photo.url_arquivo)} alt={`Foto ${photo.id_foto}`} />
                <figcaption>
                  <span>Foto #{photo.id_foto}</span>
                  <small>{formatDateTime(photo.data_upload)}</small>
                  <button
                    type="button"
                    className="button button-danger photo-card-delete"
                    onClick={() => handleDeletePhoto(photo.id_foto)}
                    disabled={deletingPhotoId === photo.id_foto}
                  >
                    {deletingPhotoId === photo.id_foto ? 'Removendo...' : 'Remover foto'}
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
