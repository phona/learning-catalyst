export function getCheckpointIdFromTupleConfig(config: unknown): string | undefined {
  const cfg = config as { configurable?: { checkpoint_id?: unknown } } | undefined;
  const checkpointId = cfg?.configurable?.checkpoint_id;
  return typeof checkpointId === 'string' ? checkpointId : undefined;
}

export function getCreatedAtFromMetadata(metadata: unknown): string | undefined {
  const md = metadata as { created_at?: unknown } | undefined;
  return typeof md?.created_at === 'string' ? md.created_at : undefined;
}

