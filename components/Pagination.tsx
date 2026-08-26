'use client';

import React from 'react';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goto = (p: number) => {
    const clamped = Math.min(Math.max(1, Math.floor(p)), totalPages);
    onPageChange(clamped);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={() => goto(1)} disabled={page <= 1} className="quick-btn">|&lt;</button>
      <button onClick={() => goto(page - 1)} disabled={page <= 1} className="quick-btn">Préc.</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 12 }}>Aller à :</label>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={page}
          onChange={(e) => goto(Number(e.target.value) || 1)}
          style={{ width: 64, padding: '6px 8px' }}
        />
      </div>

      <button onClick={() => goto(page + 1)} disabled={page >= totalPages} className="quick-btn">Suiv.</button>
      <button onClick={() => goto(totalPages)} disabled={page >= totalPages} className="quick-btn">&gt;|</button>

      {onPageSizeChange && (
        <select value={String(pageSize)} onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      )}

      <div>
        <small>Page {page} / {totalPages} — Total: {total}</small>
      </div>
    </div>
  );
}
