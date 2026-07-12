import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle, Plus } from 'lucide-react'
import api from '../lib/api'
import DataTable from '../components/DataTable'
import StatusPill from '../components/StatusPill'
import Modal from '../components/Modal'
import { useVehicles } from '../hooks/useVehicles'
import { formatCurrency } from '../lib/utils'

export default function MaintenanceLogs() {
    const qc = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const { data: allVehicles = [] } = useVehicles()

    const [formData, setFormData] = useState({
        vehicle_id: '',
        service_type: '',
        cost: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    })

    const { data: logs, isLoading } = useQuery({
        queryKey: ['maintenance'],
        queryFn: () => api.get('/maintenance').then(r => r.data),
        refetchInterval: 10000,
    })

    const createMaintenance = useMutation({
        mutationFn: (data) => api.post('/maintenance', data).then(r => r.data),
        onSuccess: () => {
            toast.success('Maintenance logged successfully!')
            qc.invalidateQueries({ queryKey: ['maintenance'] })
            qc.invalidateQueries({ queryKey: ['vehicles'] })
            setIsModalOpen(false)
            setFormData({
                vehicle_id: '',
                service_type: '',
                cost: '',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            })
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to log maintenance')
        }
    })

    const closeMaintenance = useMutation({
        mutationFn: (id) => api.patch(`/maintenance/${id}/close`),
        onSuccess: () => {
            toast.success('Maintenance completed successfully!')
            qc.invalidateQueries({ queryKey: ['maintenance'] })
            qc.invalidateQueries({ queryKey: ['vehicles'] })
        },
        onError: (err) => {
            const msg = err.response?.data?.error || 'Failed to close maintenance'
            toast.error(msg)
        },
    })

    const handleClose = (id) => {
        if (confirm('Are you sure this maintenance is completed?')) {
            closeMaintenance.mutate(id)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.vehicle_id || !formData.service_type || !formData.cost || !formData.date) {
            toast.error('Please fill in all required fields')
            return
        }
        createMaintenance.mutate({
            ...formData,
            vehicle_id: Number(formData.vehicle_id),
            cost: Number(formData.cost)
        })
    }

    const columns = [
        { key: 'vehicle_name', header: 'Vehicle / Asset' },
        { key: 'service_type', header: 'Service Type' },
        {
            key: 'cost', header: 'Cost',
            render: (v) => <span className="font-mono text-slate-400">{formatCurrency(v)}</span>
        },
        {
            key: 'date', header: 'Date',
            render: (v) => <span className="text-slate-300">{new Date(v).toLocaleDateString()}</span>
        },
        {
            key: 'status', header: 'Status',
            render: (v) => <StatusPill status={v} />
        },
        {
            key: 'notes', header: 'Notes',
            render: (v) => <span className="text-sm text-slate-400">{v || '—'}</span>
        },
        {
            key: 'actions', header: '',
            render: (_, row) => {
                if (row.status === 'Open') {
                    return (
                        <button
                            onClick={() => handleClose(row.id)}
                            disabled={closeMaintenance.isPending}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Complete
                        </button>
                    )
                }
                return null
            }
        },
    ]

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Maintenance Logs</h1>
                    <p className="page-subtitle">Track repairs and service history · {logs?.length ?? 0} records</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Log Maintenance
                </button>
            </div>

            {/* Log Maintenance Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log New Maintenance">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Vehicle</label>
                        <select 
                            className="input" 
                            value={formData.vehicle_id} 
                            onChange={e => setFormData(p => ({ ...p, vehicle_id: e.target.value }))}
                            required
                        >
                            <option value="">Select Vehicle</option>
                            {allVehicles.filter(v => v.status !== 'Retired').map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Service Type</label>
                        <input 
                            type="text" 
                            className="input" 
                            placeholder="e.g. Brake replacement, Oil change" 
                            value={formData.service_type}
                            onChange={e => setFormData(p => ({ ...p, service_type: e.target.value }))}
                            required 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Cost ($)</label>
                            <input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                className="input" 
                                placeholder="0.00" 
                                value={formData.cost}
                                onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))}
                                required 
                            />
                        </div>
                        <div>
                            <label className="label">Date</label>
                            <input 
                                type="date" 
                                className="input" 
                                value={formData.date}
                                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                required 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Notes (Optional)</label>
                        <textarea 
                            className="input min-h-[80px]" 
                            placeholder="Describe parts replaced or issues diagnosed..." 
                            value={formData.notes}
                            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={createMaintenance.isPending} className="btn-primary">
                            {createMaintenance.isPending ? 'Logging...' : 'Log Maintenance'}
                        </button>
                    </div>
                </form>
            </Modal>

            <DataTable
                columns={columns}
                data={logs}
                isLoading={isLoading}
                emptyMessage="No maintenance logs found."
            />
        </div>
    )
}
