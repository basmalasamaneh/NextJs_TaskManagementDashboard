'use client'

import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TaskStats } from '@/types'

const STATUS_COLORS = {
  Completed:   '#16a34a',
  'In Progress': '#2563eb',
  Pending:     '#d97706',
  Overdue:     '#dc2626',
}

interface TaskChartProps {
  stats: TaskStats
}

export function TaskChart({ stats }: TaskChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie')

  const pieData = [
    { name: 'Completed',   value: stats.completed,  color: STATUS_COLORS['Completed'] },
    { name: 'In Progress', value: stats.inProgress,  color: STATUS_COLORS['In Progress'] },
    { name: 'Pending',     value: stats.pending,    color: STATUS_COLORS['Pending'] },
    { name: 'Overdue',     value: stats.overdue,    color: STATUS_COLORS['Overdue'] },
  ].filter(d => d.value > 0)

  const barData = [
    { name: 'Completed',   count: stats.completed,  fill: STATUS_COLORS['Completed'] },
    { name: 'In Progress', count: stats.inProgress,  fill: STATUS_COLORS['In Progress'] },
    { name: 'Pending',     count: stats.pending,    fill: STATUS_COLORS['Pending'] },
    { name: 'Overdue',     count: stats.overdue,    fill: STATUS_COLORS['Overdue'] },
  ]

  if (stats.total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data to display
      </div>
    )
  }

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-2 mb-5">
        {(['pie', 'bar'] as const).map(type => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              chartType === type
                ? 'bg-green-600 text-white border-green-600'
                : 'text-gray-600 border-gray-200 hover:border-green-400'
            }`}
          >
            {type === 'pie' ? 'Pie Chart' : 'Bar Chart'}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 13 }}
            />
            <Legend
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span style={{ color: '#374151', fontSize: 13 }}>{value}</span>
              )}
            />
          </PieChart>
        ) : (
          <BarChart data={barData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 13 }}
              formatter={(value: number, _: string, props: any) => [value, props.payload.name]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell key={`bar-cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
