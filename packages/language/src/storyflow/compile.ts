// naive prototype: convert StoryFlow lines to SimpleScript YAML
export function storyToSimple(story: string): string {
  const lines = story.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => l.toLowerCase().startsWith('flow:'))?.replace(/^[^:]+:/, '').trim() || 'Untitled';
  const steps = lines
    .filter(l => !/^flow:|^trigger:/i.test(l))
    .map(l => {
      if (/^ask /i.test(l)) return { ask: l.slice(4).trim() };
      if (/^do:/i.test(l) || /^do /i.test(l)) return { do: l.replace(/^do:?\s*/i,'') };
      if (/^send /i.test(l)) return { send: l.slice(5).trim() };
      if (/^receive /i.test(l)) return { receive: l.slice(8).trim() };
      if (/^wait /i.test(l)) return { wait: l.slice(5).trim() };
      if (/^stop/i.test(l)) return { stop: true };
      return { remember: { note: l } };
    });
  return JSON.stringify({ flow: title, steps }, null, 2);
}
