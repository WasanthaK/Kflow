import { useState } from 'react';
import { BpmnDiagram } from './BpmnDiagram';
import { SimpleFormRenderer } from './forms/SimpleFormRenderer';
import { FormDefinition } from '@kflow/language';

type TabType = 'bpmn' | 'ir' | 'forms' | 'clarifications' | 'artifacts';

interface DualTabPanelProps {
  irJson: string;
  bpmnXml: string;
  converted: string;
  detectedForms: FormDefinition[];
  clarifications: any;
  severitySummary: Record<string, number>;
  sortedPrompts: any[];
  insightTags: any;
  confidenceBarWidth: string;
  confidenceBarColor: string;
  confidencePercentage: number | null;
  copyFeedback: string | null;
  SEVERITY_ORDER: string[];
  CLARIFICATION_TEXT: Record<string, string>;
  CLARIFICATION_SURFACE: Record<string, string>;
  CLARIFICATION_PALETTE: Record<string, string>;
  CLARIFICATION_SEVERITY_LABEL: Record<string, string>;
  formatCategoryLabel: (category: any) => string;
  handleCopyToClipboard: (text: string, label: string) => void;
  handleDownloadBpmn: () => void;
}

export function DualTabPanel(props: DualTabPanelProps) {
  const [primaryTab, setPrimaryTab] = useState<TabType>('bpmn');
  const [secondaryTab, setSecondaryTab] = useState<TabType | null>('ir');

  const tabLabels = {
    bpmn: '📊 BPMN',
    ir: '⚙️ IR',
    forms: '📝 Forms',
    clarifications: '💬 Clarify',
    artifacts: '📦 Data'
  };

  const tabCounts = {
    bpmn: null,
    ir: null,
    forms: props.detectedForms.length > 0 ? props.detectedForms.length : null,
    clarifications: props.clarifications.prompts.length > 0 ? props.clarifications.prompts.length : null,
    artifacts: null
  };

  const renderTabContent = (tab: TabType) => {
    switch (tab) {
      case 'bpmn':
        return <BpmnDiagram xml={props.bpmnXml || undefined} useAutoLayout={false} />;
      
      case 'ir':
        return props.irJson ? (
          <pre style={{margin:0,padding:12,fontSize:11,lineHeight:1.5,background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,height:'100%',overflow:'auto'}}>{props.irJson}</pre>
        ) : (
          <div style={{padding:20,textAlign:'center',color:'#9ca3af',fontSize:12}}>IR not available yet. Click "Convert" to generate.</div>
        );
      
      case 'forms':
        return props.detectedForms.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:12,height:'100%',overflow:'auto'}}>
            <div style={{fontSize:11,color:'#059669',fontStyle:'italic',padding:'8px 10px',background:'#ecfdf5',borderRadius:6,border:'1px solid #a7f3d0'}}>
              💡 Forms auto-generated from "Ask" statements
            </div>
            {props.detectedForms.map((form, index) => (
              <div key={form.id || index} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:12}}>
                <SimpleFormRenderer
                  form={form}
                  onSubmit={(data) => alert(`Form submitted!\n\n${JSON.stringify(data, null, 2)}`)}
                  onCancel={() => {}}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{padding:20,textAlign:'center',color:'#9ca3af',fontSize:12}}>No forms detected. Add "Ask" statements to your workflow.</div>
        );
      
      case 'clarifications':
        return (
          <div style={{display:'flex',flexDirection:'column',gap:12,height:'100%',overflow:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {props.SEVERITY_ORDER.filter(level => props.severitySummary[level] > 0).map(level => (
                  <span key={level} style={{fontSize:10,fontWeight:600,color:props.CLARIFICATION_TEXT[level],background:props.CLARIFICATION_SURFACE[level],padding:'3px 8px',borderRadius:999,border:`1px solid ${props.CLARIFICATION_PALETTE[level]}33`}}>
                    {props.CLARIFICATION_SEVERITY_LABEL[level]} · {props.severitySummary[level]}
                  </span>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:10,color:'#6b7280'}}>Confidence</span>
                <div style={{width:80,height:5,background:'#e5e7eb',borderRadius:999,overflow:'hidden'}}>
                  <div style={{width:props.confidenceBarWidth,height:'100%',background:props.confidenceBarColor,transition:'width 0.25s ease'}} />
                </div>
                <span style={{fontSize:10,fontWeight:600}}>{props.confidencePercentage !== null ? `${props.confidencePercentage}%` : '—'}</span>
              </div>
            </div>
            {props.clarifications.warnings.length > 0 && (
              <div style={{padding:'6px 10px',borderRadius:6,background:'#fef3c7',color:'#92400e',fontSize:11,border:'1px solid #fbbf24'}}>
                <strong>⚠️ Warnings:</strong> {props.clarifications.warnings.join(' • ')}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:10}}>
              {props.sortedPrompts.map(prompt => (
                <div key={prompt.id} style={{padding:10,borderRadius:8,background:props.CLARIFICATION_SURFACE[prompt.severity],border:`1px solid ${props.CLARIFICATION_PALETTE[prompt.severity]}33`,display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',background:props.CLARIFICATION_PALETTE[prompt.severity],color:'#fff',fontSize:9,fontWeight:700}}>
                      {props.CLARIFICATION_SEVERITY_LABEL[prompt.severity].charAt(0)}
                    </span>
                    <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.03em',textTransform:'uppercase',color:'#374151'}}>
                      {props.formatCategoryLabel(prompt.category)}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:props.CLARIFICATION_TEXT[prompt.severity],fontWeight:600,lineHeight:1.4}}>{prompt.prompt}</div>
                  {prompt.suggestion && <div style={{fontSize:11,color:'#4b5563',lineHeight:1.4}}>{prompt.suggestion}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'artifacts':
        return (
          <div style={{display:'flex',flexDirection:'column',gap:12,height:'100%',overflow:'auto'}}>
            {props.copyFeedback && (
              <div style={{padding:'6px 10px',borderRadius:4,background:'#dbeafe',color:'#1e40af',fontSize:11,fontWeight:600,textAlign:'center'}}>
                {props.copyFeedback}
              </div>
            )}
            <div style={{border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',background:'#f9fafb',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #e5e7eb'}}>
                <strong style={{fontSize:12}}>SimpleScript JSON</strong>
                <button onClick={() => props.handleCopyToClipboard(props.converted, 'SimpleScript JSON')} style={{padding:'4px 8px',fontSize:11,background:'#3b82f6',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Copy</button>
              </div>
              {props.converted?.trim() ? (
                <pre style={{margin:0,padding:12,fontSize:11,lineHeight:1.5,maxHeight:200,overflow:'auto',background:'#fff'}}>{props.converted}</pre>
              ) : (
                <div style={{padding:12,fontSize:11,color:'#9ca3af'}}>No data yet.</div>
              )}
            </div>
            <div style={{border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',background:'#f9fafb',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #e5e7eb'}}>
                <strong style={{fontSize:12}}>BPMN XML</strong>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={() => props.handleCopyToClipboard(props.bpmnXml, 'BPMN XML')} style={{padding:'4px 8px',fontSize:11,background:'#3b82f6',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Copy</button>
                  <button onClick={props.handleDownloadBpmn} style={{padding:'4px 8px',fontSize:11,background:'#10b981',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}>Download</button>
                </div>
              </div>
              {props.bpmnXml ? (
                <pre style={{margin:0,padding:12,fontSize:11,lineHeight:1.5,maxHeight:200,overflow:'auto',background:'#fff'}}>{props.bpmnXml}</pre>
              ) : (
                <div style={{padding:12,fontSize:11,color:'#9ca3af'}}>No data yet.</div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,minHeight:0,background:'#f8fafc'}}>
      {/* Tab Selector */}
      <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'#fff',padding:'6px 8px',gap:6,flexWrap:'wrap'}}>
        {(['bpmn', 'ir', 'forms', 'clarifications', 'artifacts'] as const).map(tab => {
          const isActive = primaryTab === tab || secondaryTab === tab;
          const isPrimary = primaryTab === tab;
          
          return (
            <button
              key={tab}
              onClick={() => {
                if (isPrimary) {
                  if (secondaryTab) {
                    setPrimaryTab(secondaryTab);
                    setSecondaryTab(tab);
                  }
                } else if (secondaryTab === tab) {
                  const temp = primaryTab;
                  setPrimaryTab(tab);
                  setSecondaryTab(temp);
                } else {
                  setSecondaryTab(tab);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (secondaryTab === tab) {
                  setSecondaryTab(null);
                } else if (primaryTab === tab && secondaryTab) {
                  setPrimaryTab(secondaryTab);
                  setSecondaryTab(null);
                }
              }}
              style={{
                padding:'6px 12px',
                fontSize:11,
                fontWeight:600,
                border:`1px solid ${isActive ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius:6,
                background:isActive ? (isPrimary ? '#3b82f6' : '#dbeafe') : '#f9fafb',
                color:isActive ? (isPrimary ? '#fff' : '#1e40af') : '#6b7280',
                cursor:'pointer',
                transition:'all 0.2s',
                whiteSpace:'nowrap'
              }}
            >
              {tabLabels[tab]} {tabCounts[tab] !== null && `(${tabCounts[tab]})`}
            </button>
          );
        })}
      </div>

      {/* Dual Tab Content */}
      <div style={{flex:1,display:'flex',flexDirection:secondaryTab ? 'column' : 'row',minHeight:0,overflow:'hidden'}}>
        {/* Primary Tab */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,borderBottom:secondaryTab?'2px solid #e5e7eb':'none',background:'#fff'}}>
          <div style={{padding:'8px 12px',background:'#f9fafb',borderBottom:'1px solid #e5e7eb',fontSize:12,fontWeight:600,color:'#1f2937'}}>
            {tabLabels[primaryTab]}
          </div>
          <div style={{flex:1,overflow:'hidden',padding:primaryTab==='bpmn'?0:12}}>
            {renderTabContent(primaryTab)}
          </div>
        </div>

        {/* Secondary Tab */}
        {secondaryTab && (
          <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,background:'#fff'}}>
            <div style={{padding:'8px 12px',background:'#f9fafb',borderBottom:'1px solid #e5e7eb',fontSize:12,fontWeight:600,color:'#1f2937',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{tabLabels[secondaryTab]}</span>
              <button onClick={() => setSecondaryTab(null)} style={{padding:'2px 6px',fontSize:10,background:'#ef4444',color:'#fff',border:'none',borderRadius:3,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{flex:1,overflow:'hidden',padding:secondaryTab==='bpmn'?0:12}}>
              {renderTabContent(secondaryTab)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
