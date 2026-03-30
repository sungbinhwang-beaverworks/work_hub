// 프로젝트 폴더를 읽는다: 화이트리스트/블랙리스트 기반 파일 스캔
// 에이전트에게 프로젝트 컨텍스트를 제공하기 위한 모듈

import fs from 'fs';
import path from 'path';
import { ProjectFile, ProjectScanResult } from './types';

// ── 상수 ──────────────────────────────────────────────
// 프로젝트를 찾을 경로 목록 (순서대로 탐색)
const BASE_PATHS = [
  '/Users/beaver_bin/Documents/manual_automation',
  '/Users/beaver_bin/Documents/dev',
];

/** 접근 허용 디렉토리 (프로젝트 루트 기준 상대 경로) */
const WHITELIST_DIRS = ['src', 'docs', 'public', 'sql'];

/** 접근 금지 패턴 (파일명 또는 경로에 포함되면 차단) */
const BLACKLIST_PATTERNS = [
  '.env',
  '.git',
  'node_modules',
  '.key',
  'credentials',
  '.secret',
  'dist',
  '.next',
  '.DS_Store',
];

/** 허용 파일 확장자 */
const ALLOWED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.json', '.yaml', '.yml',
  '.md', '.sql', '.css',
];

/** 제한 값 */
const MAX_FILE_SIZE = 100 * 1024;  // 100KB
const MAX_FILE_COUNT = 50;

// ── 메인 함수 ─────────────────────────────────────────

/**
 * 프로젝트 폴더를 읽는다.
 * @param projectName - 프로젝트 이름 (예: "beaver_chat_bot")
 *                      또는 "beaver_chat_bot/src/components" 같은 하위 경로
 */
export async function readProject(projectName: string): Promise<ProjectScanResult> {
  // 프로젝트 경로 결정 — 여러 BASE_PATH에서 탐색
  const folderName = projectName.split('/')[0];
  let projectPath = '';
  for (const base of BASE_PATHS) {
    const candidate = path.join(base, folderName);
    if (fs.existsSync(candidate)) {
      projectPath = candidate;
      break;
    }
  }

  if (!projectPath) {
    throw new Error(`프로젝트 경로를 찾을 수 없습니다: ${folderName} (E-03). 탐색 경로: ${BASE_PATHS.join(', ')}`);
  }

  const result: ProjectScanResult = {
    project_name: projectName.split('/')[0],
    project_path: projectPath,
    files: [],
    skipped_files: [],
    restricted_files: [],
    total_scanned: 0,
    total_loaded: 0,
  };

  // 하위 경로가 지정된 경우 해당 디렉토리만 스캔
  const subPath = projectName.includes('/')
    ? projectName.split('/').slice(1).join('/')
    : null;

  if (subPath) {
    const targetDir = path.join(projectPath, subPath);
    if (fs.existsSync(targetDir)) {
      scanDirectory(targetDir, projectPath, result);
    }
  } else {
    // 화이트리스트 디렉토리만 스캔
    for (const dir of WHITELIST_DIRS) {
      const targetDir = path.join(projectPath, dir);
      if (fs.existsSync(targetDir)) {
        scanDirectory(targetDir, projectPath, result);
      }
    }
    // package.json은 루트에서 직접 읽기
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      loadFile(pkgPath, projectPath, result);
    }
  }

  return result;
}

// ── 내부 함수 ─────────────────────────────────────────

function scanDirectory(
  dirPath: string,
  projectRoot: string,
  result: ProjectScanResult,
) {
  if (result.total_loaded >= MAX_FILE_COUNT) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (result.total_loaded >= MAX_FILE_COUNT) break;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(projectRoot, fullPath);

    // 블랙리스트 체크
    if (isBlacklisted(relativePath, entry.name)) {
      result.restricted_files.push(relativePath);
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, projectRoot, result);
    } else if (entry.isFile()) {
      loadFile(fullPath, projectRoot, result);
    }
  }
}

function loadFile(
  filePath: string,
  projectRoot: string,
  result: ProjectScanResult,
) {
  const relativePath = path.relative(projectRoot, filePath);
  const ext = path.extname(filePath).toLowerCase();

  result.total_scanned++;

  // 확장자 체크
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    result.skipped_files.push(`${relativePath} (확장자 비허용: ${ext})`);
    return;
  }

  // 크기 체크
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_FILE_SIZE) {
    result.skipped_files.push(`${relativePath} (크기 초과: ${Math.round(stat.size / 1024)}KB)`);
    return;
  }

  // 블랙리스트 체크
  if (isBlacklisted(relativePath, path.basename(filePath))) {
    result.restricted_files.push(relativePath);
    return;
  }

  // 파일 읽기
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    result.files.push({
      path: relativePath,
      content,
      size: stat.size,
    });
    result.total_loaded++;
  } catch {
    result.skipped_files.push(`${relativePath} (읽기 실패)`);
  }
}

function isBlacklisted(relativePath: string, fileName: string): boolean {
  return BLACKLIST_PATTERNS.some(pattern =>
    relativePath.includes(pattern) || fileName.includes(pattern)
  );
}
