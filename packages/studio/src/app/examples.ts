export interface ExampleFile {
  id: string;
  label: string;
  path: string;
}

type ExampleLoader = () => Promise<string>;

const RAW_EXAMPLE_MODULES = import.meta.glob('../../../../examples/**/*.{story,txt,yaml,yml,md}', {
  eager: false,
  import: 'default',
  query: '?raw',
});

const exampleLoaders = new Map<string, ExampleLoader>();
const exampleFilesInternal: ExampleFile[] = [];

for (const [path, loader] of Object.entries(RAW_EXAMPLE_MODULES)) {
  const relativePath = extractRelativePath(path);
  if (!relativePath) {
    continue;
  }

  exampleLoaders.set(relativePath, loader as ExampleLoader);
  exampleFilesInternal.push({
    id: relativePath,
    label: relativePath,
    path,
  });
}

exampleFilesInternal.sort((a, b) => a.label.localeCompare(b.label));

export const exampleFiles: ExampleFile[] = exampleFilesInternal;

export async function loadExample(id: string): Promise<string> {
  const loader = exampleLoaders.get(id);
  if (!loader) {
    throw new Error(`Unknown example file: ${id}`);
  }

  return loader();
}

function extractRelativePath(fullPath: string): string | undefined {
  const marker = '/examples/';
  const index = fullPath.lastIndexOf(marker);
  if (index === -1) {
    return undefined;
  }
  return fullPath.slice(index + marker.length);
}
