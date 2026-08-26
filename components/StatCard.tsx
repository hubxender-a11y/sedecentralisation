import React from 'react';
import { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  color?: string;
  trend?: string;
  trendType?: 'up' | 'down';
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = '#dc2626',
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div
        className="stat-icon"
        style={{
          background: color,
        }}
      >
        <Icon size={28} />
      </div>

      <div>
        <h2>{value}</h2>
        <p>{title}</p>
      </div>
    </div>
  );
}
