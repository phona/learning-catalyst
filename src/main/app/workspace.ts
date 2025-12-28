import path from 'node:path';

export const resolveWorkspacePath = (params: {
  argv: string[];
  envWorkspacePath?: string;
  cwd: string;
}) => {
  const workspaceArg = params.argv.find((arg) => !arg.includes('electron') && !arg.includes('--'));
  const workspacePath = params.envWorkspacePath
    ? path.resolve(params.envWorkspacePath)
    : workspaceArg
      ? path.resolve(workspaceArg)
      : params.cwd;

  return {
    workspacePath,
    learningCatalystPath: path.join(workspacePath, '.catalyst'),
  };
};

