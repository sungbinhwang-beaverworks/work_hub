// YAML 파일에서 에이전트 설정을 로드한다
// data/agents/ 디렉토리의 YAML 파일을 읽어서 AgentConfig 객체로 변환

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { AgentConfig } from './types';

const AGENTS_DIR = path.join(process.cwd(), 'src', 'data', 'agents');

let _cache: Map<string, AgentConfig> | null = null;

export function getAllAgents(): AgentConfig[] {
  if (!_cache) { loadAll(); }
  return Array.from(_cache!.values());
}

export function getAgent(id: string): AgentConfig | undefined {
  if (!_cache) { loadAll(); }
  return _cache!.get(id);
}

function loadAll() {
  _cache = new Map();
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.yaml'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
    const config = yaml.load(content) as AgentConfig;
    _cache.set(config.id, config);
  }
}
