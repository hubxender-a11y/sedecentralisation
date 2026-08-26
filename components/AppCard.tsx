import React from 'react';

type AppCardProps = {
  title: string;
  icon: string;
  description: string;
};

export default function AppCard({ title, icon, description }: AppCardProps) {
  return (
    <div className="app-card">
      <div className="app-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}
