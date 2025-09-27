#!/usr/bin/env node

// Test the autocomplete system with your actual OpenAI API key
// Usage: node test-autocomplete-with-key.js "your-api-key-here"

const { StoryFlowAutocomplete } = require('./packages/language/dist/storyflow/autocomplete.js');

const apiKey = process.argv[2];

if (!apiKey) {
  console.log('❌ Please provide your OpenAI API key as an argument:');
  console.log('   node test-autocomplete-with-key.js "sk-your-api-key-here"');
  console.log('');
  console.log('🔗 Get your API key from: https://platform.openai.com/account/api-keys');
  process.exit(1);
}

console.log('🔍 Testing StoryFlow Autocomplete with OpenAI API...');

const autocomplete = new StoryFlowAutocomplete(apiKey);

const testCases = [
  {
    name: 'Starting an approval workflow',
    context: {
      currentLine: '',
      previousLines: ['Flow: Approve Vacation Request'],
      cursorPosition: 0
    }
  },
  {
    name: 'Typing "Ask" for suggestions',
    context: {
      currentLine: 'Ask ',
      previousLines: ['Flow: Employee Onboarding'],
      cursorPosition: 4
    }
  },
  {
    name: 'After an If condition',
    context: {
      currentLine: '  ',
      previousLines: [
        'Flow: Process Order',
        'Ask customer for payment details',
        'If payment_successful'
      ],
      cursorPosition: 2
    }
  }
];

async function runTests() {
  for (const test of testCases) {
    console.log(`\n📝 ${test.name}:`);
    try {
      const suggestions = await autocomplete.getSuggestions(test.context);
      console.log(`   🎯 Got ${suggestions.length} AI-powered suggestions:`);
      suggestions.slice(0, 5).forEach((s, i) => {
        console.log(`   ${i+1}. [${s.type}] ${s.text}`);
        if (s.description) {
          console.log(`      💡 ${s.description}`);
        }
      });
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n✅ Test complete! If you see AI-powered suggestions above, your API key is working correctly.');
}

runTests();