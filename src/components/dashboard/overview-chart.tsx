'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { faNumber } from '@/lib/persian'

const DAY_LABELS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']

function faDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const label = DAY_LABELS[d.getDay()]
  return `${label} ${faNumber(d.getDate())}`
}

export function OverviewChart({ data }: { data: { date: string; count: number }[] }) {
  const chartData = data.map((d) => ({ name: faDay(d.date), count: d.count }))
  return (
    <div className="h-48 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0 0 / 0.4)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} interval={0} angle={-20} textAnchor="end" height={48} />
          <YAxis tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} allowDecimals={false} width={32} />
          <Tooltip
            formatter={(v: number | string) => [`${v} پاسخ`, '']}
            labelStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl' }}
            contentStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl', borderRadius: 12 }}
          />
          <Bar dataKey="count" fill="oklch(0.52 0.14 175)" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
