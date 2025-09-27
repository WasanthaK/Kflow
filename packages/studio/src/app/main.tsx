import { useState } from 'react';
import { rewriteToSimpleScript, guardrails } from '../codex';

export function App() {
  const [story, setStory] = useState('Flow: Example');
  const [assistVisible, setAssistVisible] = useState(false);

  return (
    <div>
      <h1>Kflow Studio</h1>
      <textarea value={story} onChange={event => setStory(event.target.value)} />
      <button type="button" onClick={() => setAssistVisible(visible => !visible)}>
        {assistVisible ? 'Hide Assist' : 'Assist'}
      </button>
      {assistVisible && <pre>{rewriteToSimpleScript}</pre>}
      <ul>
        {guardrails.map(rule => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}
