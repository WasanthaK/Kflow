import React, { useState } from 'react';

interface TopBarProps {
  detectedActors: string[];
  bpmnInfo: any;
  aiEngines: string[];
  selectedEngine: string;
  onEngineChange: (engine: string) => void;
  onExportPDF: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  detectedActors,
  bpmnInfo,
  aiEngines,
  selectedEngine,
  onEngineChange,
  onExportPDF
}) => {
  const [showActors, setShowActors] = useState(false);
  const [showBPMN, setShowBPMN] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#f3f4f6',
      borderBottom: '1px solid #e5e7eb',
      padding: '6px 16px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Info Icon for Actors */}
      <span style={{ cursor: 'pointer', color: '#2563eb', fontSize: 20, fontWeight: 'bold' }} onClick={() => setShowActors(!showActors)} title="Show detected actors">
        ℹ️
      </span>
      {showActors && (
        <div style={{
          position: 'absolute',
          top: 40,
          left: 20,
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: 16,
          minWidth: 220
        }}>
          <b>Detected Actors:</b>
          <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none' }}>
            {detectedActors.map(actor => (
              <li key={actor} style={{ color: '#6366f1', fontWeight: 500 }}>{actor}</li>
            ))}
          </ul>
        </div>
      )}
      {/* BPMN Info Popup */}
      <span style={{ cursor: 'pointer', color: '#10b981', fontSize: 20 }} onClick={() => setShowBPMN(!showBPMN)} title="Show BPMN info">
        🤖
      </span>
      {showBPMN && (
        <div style={{
          position: 'absolute',
          top: 40,
          left: 60,
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: 16,
          minWidth: 320,
          maxWidth: 500,
          fontSize: 13
        }}>
          <b>BPMN Model Info</b>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{JSON.stringify(bpmnInfo, null, 2)}</pre>
        </div>
      )}
      {/* Export PDF */}
      <span style={{ cursor: 'pointer', color: '#f59e0b', fontSize: 20 }} onClick={onExportPDF} title="Export graph to PDF">
        📥
      </span>
      {/* AI Engine Selection */}
      <select value={selectedEngine} onChange={e => onEngineChange(e.target.value)} style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 4 }}>
        {aiEngines.map(engine => (
          <option key={engine} value={engine}>{engine}</option>
        ))}
      </select>
    </div>
  );
};

export default TopBar;
