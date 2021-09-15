import { Tree, formatFiles, installPackagesTask, updateJson, readJson } from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/workspace/generators';

export default async function (tree: Tree, schema: any) {
  // await updateJson(tree, 'workspace.json', (workspaceJson) => {
  //   workspaceJson.defaultProject = 'api';
  //   return workspaceJson;
  //   return workspaceJson;
  // });
  const scopes = getScopes(readJson(tree, 'nx.json'));
  updateJson(tree, 'tools/generators/util-lib/schema.json', schemaJson => {
    schemaJson.properties.directory["x-prompt"].items = scopes.map(scope => ({
      value: scope,
      label: scope
    }))
    return schemaJson;
  });
  const content = tree.read('tools/generators/util-lib/index.ts', 'utf-8');
  const newContent = replaceScopes(content, scopes);
  tree.write('tools/generators/util-lib/index.ts', newContent);
  await formatFiles(tree);
}


function getScopes(nxJson: any) {
  const projects: any[] = Object.values(nxJson.projects);
  const allScopes: string[] = projects
    .map((project) =>
      project.tags
        // take only those that point to scope
        .filter((tag: string) => tag.startsWith('scope:'))
    )
    // flatten the array
    .reduce((acc, tags) => [...acc, ...tags], [])
    // remove prefix `scope:`
    .map((scope: string) => scope.slice(6));
  // remove duplicates
  return Array.from(new Set(allScopes));
}

function replaceScopes(content: string, scopes: string[]): string {
  const joinScopes = scopes.map((s) => `'${s}'`).join(' | ');
  console.log('joinScopes', joinScopes)
  const PATTERN = /interface Schema \{\n.*\n.*\n\}/gm;
  return content.replace(
    PATTERN,
    `interface Schema {
  name: string;
  directory: ${joinScopes};
}`
  );
}

function addScopeIfMissing(host: Tree) {
  updateJson(host, 'nx.json', json => {
    Object.keys(json.projects).forEach(projectName => {
      if (!json.projects[projectName].tags.some(tag => tag.startsWith('scope:'))) {
        const scope = projectName.split('-')[0];
        json.projects[projectName].tags.push(`scope:${scope}`);
      }

    });
    return json;
  });
}
