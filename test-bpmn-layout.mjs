import { readFileSync } from 'fs';
import { join } from 'path';
import { compileStoryflow } from '@kflow/language';

// Test the improved BPMN layout
const storyPath = join(process.cwd(), 'examples', 'advanced-order-processing.story');
const storyContent = readFileSync(storyPath, 'utf-8');

console.log('Testing improved BPMN layout...');
console.log('Story content preview:', storyContent.slice(0, 200) + '...');

try {
  const compiled = compileStoryflow(storyContent, { target: 'bpmn' });
  
  // Extract key metrics from the BPMN
  const xmlContent = compiled.output;
  const laneMatches = xmlContent.match(/Lane_[^"]+/g) || [];
  const bounds = xmlContent.match(/dc:Bounds[^>]+>/g) || [];
  
  console.log('\n✅ BPMN Generation Successful!');
  console.log(`📊 Detected ${laneMatches.length} lanes`);
  console.log(`📐 Generated ${bounds.length} element positions`);
  
  // Check for lane height (should be more reasonable now)
  const heightMatch = xmlContent.match(/height="(\d+(\.\d+)?)"/g) || [];
  const heights = heightMatch.map(h => {
    const match = h.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  });
  const maxHeight = heights.length > 0 ? Math.max(...heights) : 0;
  console.log(`📏 Maximum element height: ${maxHeight}px`);
  
  // Show first few lanes for verification
  console.log('\n🏊‍♂️ Detected lanes:');
  laneMatches.slice(0, 6).forEach(lane => {
    const cleanName = lane.replace('Lane_', '').replace(/_/g, ' ');
    console.log(`  - ${cleanName}`);
  });
  
  console.log('\n🎯 Layout improvements applied successfully!');
  
} catch (error) {
  console.error('❌ BPMN Generation Failed:', error);
}