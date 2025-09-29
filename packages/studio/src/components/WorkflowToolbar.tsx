import React, { useState, useEffect } from 'react';

interface Actor {
  name: string;
  type: 'user' | 'system' | 'external';
  lane: string;
  confidence: number;
}

interface WorkflowToolbarProps {
  detectedActors: Actor[];
  bpmnAnalysis: any;
  onExportPDF: () => void;
  onAIEngineChange: (engine: string) => void;
  selectedAIEngine: string;
}

const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  detectedActors,
  bpmnAnalysis,
  onExportPDF,
  onAIEngineChange,
  selectedAIEngine
}) => {
  const [showActorsPopup, setShowActorsPopup] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);

  // Dictionary overlay with Ctrl key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setShowDictionary(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey) {
        setShowDictionary(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const aiEngines = [
    { id: 'openai-gpt4', name: 'OpenAI GPT-4' },
    { id: 'anthropic-claude', name: 'Anthropic Claude' },
    { id: 'google-gemini', name: 'Google Gemini' },
    { id: 'local-llama', name: 'Local Llama' }
  ];

  const getActorIcon = (type: string) => {
    switch (type) {
      case 'user': return '👤';
      case 'system': return '⚙️';
      case 'external': return '🔗';
      default: return '❓';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      {/* Main Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          {/* AI Actors Info */}
          <button
            onClick={() => setShowActorsPopup(!showActorsPopup)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors relative"
          >
            🤖
            <span className="text-sm font-medium text-blue-700">
              AI Actors ({detectedActors.length})
            </span>
            {bpmnAnalysis.confidence && (
              <span className={`text-xs ${getConfidenceColor(bpmnAnalysis.confidence)}`}>
                {Math.round(bpmnAnalysis.confidence * 100)}%
              </span>
            )}
          </button>

          {/* BPMN Analysis Summary */}
          <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
            Model: {bpmnAnalysis.model_style || 'role-centric'} | 
            Pools: {bpmnAnalysis.pools?.length || 0} | 
            Lanes: {detectedActors.length}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* AI Engine Selector */}
          <select
            value={selectedAIEngine}
            onChange={(e) => onAIEngineChange(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {aiEngines.map(engine => (
              <option key={engine.id} value={engine.id}>
                {engine.name}
              </option>
            ))}
          </select>

          {/* Export PDF */}
          <button
            onClick={onExportPDF}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
          >
            📄
            <span className="text-sm font-medium">Export PDF</span>
          </button>

          {/* Dictionary Hint */}
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Press <kbd className="bg-white px-1 border">Ctrl+D</kbd> for dictionary
          </div>
        </div>
      </div>

      {/* AI Actors Popup */}
      {showActorsPopup && (
        <div className="absolute top-16 left-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-96">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">🤖 AI-Detected Actors</h3>
              <button
                onClick={() => setShowActorsPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {detectedActors.map((actor, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getActorIcon(actor.type)}</span>
                    <div>
                      <div className="font-medium text-sm">{actor.name}</div>
                      <div className="text-xs text-gray-500">Lane: {actor.lane}</div>
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${getConfidenceColor(actor.confidence)}`}>
                    {Math.round(actor.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>

            {bpmnAnalysis.assumptions && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-xs font-semibold text-gray-600 mb-1">Assumptions:</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  {bpmnAnalysis.assumptions.map((assumption: string, i: number) => (
                    <li key={i}>• {assumption}</li>
                  ))}
                </ul>
              </div>
            )}

            {bpmnAnalysis.advice && (
              <div className="mt-2">
                <h4 className="text-xs font-semibold text-gray-600 mb-1">BPMN Advice:</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  {bpmnAnalysis.advice.slice(0, 3).map((advice: string, i: number) => (
                    <li key={i}>• {advice}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dictionary Overlay */}
      {showDictionary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">📚 Workflow Dictionary</h2>
              <div className="text-sm text-gray-500">Hold Ctrl+D to keep open</div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-blue-600 mb-2">🎭 Actors</h3>
                <div className="space-y-1">
                  {detectedActors.map((actor, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-mono bg-blue-50 px-1 rounded">{actor.name}</span>
                      <span className="text-gray-500 ml-2">{actor.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-green-600 mb-2">⚡ Actions</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-mono bg-green-50 px-1 rounded">task</span> - User/Manual task</div>
                  <div><span className="font-mono bg-green-50 px-1 rounded">service</span> - System service call</div>
                  <div><span className="font-mono bg-green-50 px-1 rounded">gateway</span> - Decision point</div>
                  <div><span className="font-mono bg-green-50 px-1 rounded">timer</span> - Wait/delay</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-purple-600 mb-2">🔀 Gateways</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-mono bg-purple-50 px-1 rounded">if/else</span> - Exclusive (XOR)</div>
                  <div><span className="font-mono bg-purple-50 px-1 rounded">parallel</span> - Parallel (AND)</div>
                  <div><span className="font-mono bg-purple-50 px-1 rounded">inclusive</span> - Inclusive (OR)</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-orange-600 mb-2">📡 Events</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-mono bg-orange-50 px-1 rounded">start</span> - Process start</div>
                  <div><span className="font-mono bg-orange-50 px-1 rounded">end</span> - Process end</div>
                  <div><span className="font-mono bg-orange-50 px-1 rounded">message</span> - Message event</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkflowToolbar;