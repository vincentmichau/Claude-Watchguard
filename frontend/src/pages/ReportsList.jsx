import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { Plus, FileText, Search, Filter, Download, Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ReportsList() {
  const [filters, setFilters] = useState({
    status: '',
    siteId: '',
    startDate: '',
    endDate: '',
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => reportsAPI.getAll(filters).then(res => res.data),
  });

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800',
    validated: 'bg-green-100 text-green-800',
    sent: 'bg-blue-100 text-blue-800',
  };

  const statusLabels = {
    draft: 'Brouillon',
    validated: 'Validé',
    sent: 'Envoyé',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-500 mt-1">Gérez vos rapports de veille</p>
        </div>
        <Link
          to="/dashboard/reports/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau rapport
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un rapport..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="validated">Validé</option>
            <option value="sent">Envoyé</option>
          </select>

          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Plus de filtres
          </button>
        </div>
      </div>

      {/* Reports list */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-2">Chargement...</p>
        </div>
      ) : reports?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun rapport</h3>
          <p className="text-gray-500 mb-4">Commencez par créer votre premier rapport</p>
          <Link
            to="/dashboard/reports/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            Créer un rapport
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports?.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {report.title || 'Rapport sans titre'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                      {statusLabels[report.status]}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {report.site_name}
                    </span>
                    <span>•</span>
                    <span>{report.client_name}</span>
                    <span>•</span>
                    <span>{format(new Date(report.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                  </div>

                  {report.summary && (
                    <p className="mt-3 text-gray-600 line-clamp-2">{report.summary}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {report.status === 'validated' && (
                    <>
                      <button
                        className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50"
                        title="Télécharger PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50"
                        title="Envoyer par email"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  
                  <Link
                    to={`/dashboard/reports/${report.id}`}
                    className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors"
                  >
                    {report.status === 'draft' ? 'Modifier' : 'Voir'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
