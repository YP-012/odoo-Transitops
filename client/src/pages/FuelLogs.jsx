import { useQuery } from '@tanstack/react-query'
import { Fuel } from 'lucide-react'
import api from '../lib/api'
import DataTable from '../components/DataTable'
import { formatCurrency } from '../lib/utils'

export default function FuelLogs() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['fuel-logs'],
        queryFn: () => api.get('/fuel-logs').then(r => r.data),
        refetchInterval: 10000,
    })

    const columns = [
        { key: 'vehicle_name', header: 'Vehicle / Asset' },
        {
            key: 'liters', header: 'Fuel Consumed',
            render: (v) => <span className="font-mono text-slate-300">{Number(v).toFixed(1)} Liters</span>
        },
        {
            key: 'cost', header: 'Total Cost',
            render: (v) => <span className="font-mono text-slate-400">{formatCurrency(v)}</span>
        },
        {
            key: 'cost_per_liter', header: 'Cost per Liter',
            render: (_, row) => {
                const liters = Number(row.liters)
                const cost = Number(row.cost)
                const perLiter = liters > 0 ? cost / liters : 0
                return <span className="font-mono text-slate-400">{formatCurrency(perLiter)}/L</span>
            }
        },
        {
            key: 'date', header: 'Date Logged',
            render: (v) => <span className="text-slate-300">{new Date(v).toLocaleDateString()}</span>
        }
    ]

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Fuel Logs</h1>
                    <p className="page-subtitle">Track fuel consumption and expenses · {logs?.length ?? 0} records</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={logs}
                isLoading={isLoading}
                emptyMessage="No fuel logs found. Complete trips to record fuel consumption."
            />
        </div>
    )
}
