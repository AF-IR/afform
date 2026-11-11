'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { faNumber } from '@/lib/persian'

const COLORS = ['oklch(0.52 0.14 175)', 'oklch(0.6 0.12 230)', 'oklch(0.7 0.13 90)', 'oklch(0.62 0.16 330)', 'oklch(0.55 0.15 45)']

const tooltipStyle = {
  fontFamily: 'Vazirmatn',
  direction: 'rtl' as const,
  borderRadius: 12,
  border: '1px solid oklch(0.92 0 0)',
}

export function ChoicePie({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={3}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number | string) => faNumber(Number(v))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RatingBars({ data }: { data: { value: number; count: number }[] }) {
  const chartData = data.map((d) => ({ name: faNumber(d.value), count: d.count }))
  return (
    <div className="h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0 0 / 0.4)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Vazirmatn' }} />
          <YAxis tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} allowDecimals={false} width={32} />
          <Tooltip formatter={(v: number | string) => [`${v} پاسخ`, '']} contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="oklch(0.52 0.14 175)" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TimelineChart({ data }: { data: { date: string; count: number }[] }) {
  const chartData = data.map((d) => ({ name: faNumber(Number(d.date.slice(8, 10))), count: d.count }))
  return (
    <div className="h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0 0 / 0.4)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} />
          <YAxis tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} allowDecimals={false} width={32} />
          <Tooltip formatter={(v: number | string) => [`${v} پاسخ`, '']} labelFormatter={(l) => `روز ${l}`} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="count" stroke="oklch(0.52 0.14 175)" strokeWidth={2.5} dot={{ r: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ScoreHistogram({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <div className="h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0 0 / 0.4)" />
          <XAxis dataKey="bucket" tick={{ fontSize: 9, fontFamily: 'Vazirmatn' }} interval={0} />
          <YAxis tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} allowDecimals={false} width={32} />
          <Tooltip formatter={(v: number | string) => [`${v} نفر`, '']} contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="oklch(0.6 0.12 230)" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
