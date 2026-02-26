import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI, eventsAPI, photosAPI, pdfAPI } from '../services/api';
import { useDropzone } from 'react-dropzone';
import { 
  Save, Send, CheckCircle, Plus, Trash2, Upload, 
  Image as ImageIcon, AlertCircle, Download, X 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function ReportEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [report, setReport] = useState({
    title: '',
    summary: '',
    shiftId: '',
  });

  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    type: 'observation',
    severity: 'low',
    title: '',
    description: '',
    location: '',
    eventTime: new Date().toISOString().slice(0, 16),
  });

  const [showEventForm, setShowEventForm] = useState(false);

  // Fetch report
  const { data: reportData } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsAPI.getById(id).then(res => res.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (reportData) {
      setReport({
        title: reportData.title,
        summary: reportData.summary,
        shiftId: reportData.shift_id,
      });
      setEvents(reportData.events || []);
    }
  }, [reportData]);

  // Save report mutation
  const saveMutation = useMutation({
    mutationFn: (data) => 
      isNew ? reportsAPI.create(data) : reportsAPI.update(id, data),
    onSuccess: (response) => {
      toast.success('Rapport enregistré');
      if (isNew) {
        navigate(`/dashboard/reports/${response.data.id}`);
      }
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['report', id]);
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  // Validate report mutation
  const validateMutation = useMutation({
    mutationFn: () => reportsAPI.validate(id),
    onSuccess: () => {
      toast.success('Rapport validé');
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['report', id]);
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  // Add event mutation
  const addEventMutation = useMutation({
    mutationFn: (data) => eventsAPI.create({ ...data, reportId: id }),
    onSuccess: () => {
      toast.success('Événement ajouté');
      setShowEventForm(false);
      setNewEvent({
        type: 'observation',
        severity: 'low',
        title: '',
        description: '',
        location: '',
        eventTime: new Date().toISOString().slice(0, 16),
      });
      queryClient.invalidateQueries(['report', id]);
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId) => eventsAPI.delete(eventId),
    onSuccess: () => {
      toast.success('Événement supprimé');
      queryClient.invalidateQueries(['report', id]);
    },
  });

  // Photo upload
  const uploadPhotoMutation = useMutation({
    mutationFn: (formData) => photosAPI.upload(formData),
    onSuccess: () => {
      toast.success('Photo téléchargée');
      queryClient.invalidateQueries(['report', id]);
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 5242880, // 5MB
    onDrop: (files) => {
      files.forEach(file => {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('reportId', id);
        uploadPhotoMutation.mutate(formData);
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(report);
  };

  const handleValidate = () => {
    if (window.confirm('Êtes-vous sûr de vouloir valider ce rapport ? Il ne pourra plus être modifié.')) {
      validateMutation.mutate();
    }
  };

  const handleSendEmail = async () => {
    try {
      await pdfAPI.send(id);
      toast.success('Email envoyé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await pdfAPI.generate(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const isReadOnly = reportData?.status === 'validated' || reportData?.status === 'sent';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Nouveau rapport' : report.title || 'Rapport'}
          </h1>
          {reportData?.status && (
            <p className="text-sm text-gray-500 mt-1">
              Statut: <span className="font-medium capitalize">{reportData.status}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
              <button
                onClick={handleValidate}
                disabled={validateMutation.isPending || isNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Valider
              </button>
            </>
          )}
          
          {reportData?.status === 'validated' && (
            <>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={handleSendEmail}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Send className="w-4 h-4" />
                Envoyer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre
          </label>
          <input
            type="text"
            value={report.title}
            onChange={(e) => setReport({ ...report, title: e.target.value })}
            disabled={isReadOnly}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            placeholder="Titre du rapport"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Résumé
          </label>
          <textarea
            value={report.summary}
            onChange={(e) => setReport({ ...report, summary: e.target.value })}
            disabled={isReadOnly}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            placeholder="Résumé de la nuit..."
          />
        </div>
      </div>

      {/* Events */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Événements</h2>
          {!isReadOnly && !isNew && (
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          )}
        </div>

        {showEventForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="observation">Observation</option>
                  <option value="incident">Incident</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gravité</label>
                <select
                  value={newEvent.severity}
                  onChange={(e) => setNewEvent({ ...newEvent, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
            </div>
            
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Titre de l'événement"
            />
            
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Description..."
            />

            <div className="flex gap-3">
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Lieu"
              />
              <input
                type="datetime-local"
                value={newEvent.eventTime}
                onChange={(e) => setNewEvent({ ...newEvent, eventTime: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEventForm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => addEventMutation.mutate(newEvent)}
                disabled={!newEvent.title || !newEvent.description}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      event.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {event.severity}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded capitalize">
                      {event.type}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {event.location && <span>📍 {event.location}</span>}
                    <span>🕐 {format(new Date(event.event_time), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => deleteEventMutation.mutate(event.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Aucun événement enregistré</p>
            </div>
          )}
        </div>
      </div>

      {/* Photos */}
      {!isNew && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
          
          {!isReadOnly && (
            <div {...getRootProps()} className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-primary-500 transition-colors">
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Glissez vos photos ici ou cliquez pour sélectionner</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (max 5MB)</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            {reportData?.photos?.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photosAPI.get(photo.id)}
                  alt={photo.file_name}
                  className="w-full h-32 object-cover rounded-lg"
                />
                {!isReadOnly && (
                  <button
                    onClick={() => photosAPI.delete(photo.id).then(() => queryClient.invalidateQueries(['report', id]))}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {reportData?.photos?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Aucune photo</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
