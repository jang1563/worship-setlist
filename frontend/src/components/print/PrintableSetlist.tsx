import { forwardRef } from 'react';
import type { SetlistSong } from '@/types';

interface PrintableSetlistProps {
  title?: string;
  date?: string;
  serviceType?: string;
  songs: SetlistSong[];
}

export const PrintableSetlist = forwardRef<HTMLDivElement, PrintableSetlistProps>(
  ({ title, date, serviceType, songs }, ref) => {
    const formatDuration = (seconds?: number) => {
      if (!seconds) return '-';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const totalDuration = songs.reduce(
      (acc, s) => acc + (s.song?.duration_sec || 0),
      0
    );

    return (
      <div ref={ref} className="printable-setlist">
        {/* Print-only styles */}
        <style>
          {`
            @media print {
              /* Hide everything except printable content */
              body * {
                visibility: hidden;
              }
              .printable-setlist,
              .printable-setlist * {
                visibility: visible;
              }
              .printable-setlist {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 20mm;
                box-sizing: border-box;
              }

              /* Print styles */
              .print-header {
                text-align: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 2px solid #333;
              }
              .print-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 8px;
              }
              .print-meta {
                font-size: 14px;
                color: #666;
              }
              .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
              }
              .print-table th,
              .print-table td {
                border: 1px solid #ddd;
                padding: 10px 12px;
                text-align: left;
              }
              .print-table th {
                background-color: #f5f5f5;
                font-weight: bold;
                font-size: 12px;
                text-transform: uppercase;
              }
              .print-table td {
                font-size: 14px;
              }
              .print-table tr:nth-child(even) {
                background-color: #fafafa;
              }
              .print-order {
                width: 40px;
                text-align: center;
                font-weight: bold;
              }
              .print-key {
                width: 60px;
                text-align: center;
                font-family: monospace;
                font-weight: bold;
              }
              .print-duration {
                width: 80px;
                text-align: center;
              }
              .print-footer {
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
              .print-total {
                text-align: right;
                font-weight: bold;
                margin-top: 16px;
              }

              /* Hide screen-only elements */
              .screen-only {
                display: none !important;
              }
            }

            /* Screen preview styles */
            @media screen {
              .printable-setlist {
                background: white;
                padding: 24px;
                max-width: 800px;
                margin: 0 auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
              }
              .print-header {
                text-align: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 2px solid #333;
              }
              .print-title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #111827;
              }
              .print-meta {
                font-size: 14px;
                color: #6b7280;
              }
              .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
              }
              .print-table th,
              .print-table td {
                border: 1px solid #e5e7eb;
                padding: 10px 12px;
                text-align: left;
              }
              .print-table th {
                background-color: #f9fafb;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                color: #374151;
              }
              .print-table td {
                font-size: 14px;
                color: #111827;
              }
              .print-table tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .print-order {
                width: 40px;
                text-align: center;
                font-weight: bold;
              }
              .print-key {
                width: 60px;
                text-align: center;
                font-family: monospace;
                font-weight: bold;
                background-color: #f3f4f6;
              }
              .print-duration {
                width: 80px;
                text-align: center;
              }
              .print-footer {
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
                text-align: center;
              }
              .print-total {
                text-align: right;
                font-weight: bold;
                margin-top: 16px;
                color: #374151;
              }
            }
          `}
        </style>

        {/* Header */}
        <div className="print-header">
          <h1 className="print-title">{title || '송리스트'}</h1>
          <div className="print-meta">
            {date && <span>{date}</span>}
            {date && serviceType && <span> | </span>}
            {serviceType && <span>{serviceType}</span>}
          </div>
        </div>

        {/* Songs table */}
        <table className="print-table">
          <thead>
            <tr>
              <th className="print-order">#</th>
              <th>곡 제목</th>
              <th>아티스트</th>
              <th className="print-key">키</th>
              <th className="print-duration">재생시간</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((item, index) => (
              <tr key={item.id}>
                <td className="print-order">{index + 1}</td>
                <td>
                  <div>{item.song?.title || '알 수 없는 곡'}</div>
                  {item.song?.title_en && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {item.song.title_en}
                    </div>
                  )}
                </td>
                <td>{item.song?.artist || '-'}</td>
                <td className="print-key">{item.key}</td>
                <td className="print-duration">
                  {formatDuration(item.song?.duration_sec)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total duration */}
        <div className="print-total">
          총 재생시간: {Math.floor(totalDuration / 60)}분 {totalDuration % 60}초
          ({songs.length}곡)
        </div>

        {/* Footer */}
        <div className="print-footer">
          송플래너 | 인쇄일: {new Date().toLocaleDateString('ko-KR')}
        </div>
      </div>
    );
  }
);

PrintableSetlist.displayName = 'PrintableSetlist';
