// 산출물 파일 읽기 API
// GET /api/pipeline/file?path=docs/analysis/xxx.md
// docs/ 하위 .md 파일만 허용

import { NextRequest } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const PROJECT_ROOT = /* turbopackIgnore: true */ process.cwd();
const MAX_FILE_SIZE = 100 * 1024; // 100KB

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');

  // 1. 경로 검증
  if (!filePath || filePath.includes('..') || !filePath.endsWith('.md')) {
    return Response.json(
      { error: '허용되지 않는 경로입니다' },
      { status: 403 }
    );
  }

  // 2. docs/ 하위인지 확인
  const absolutePath = path.resolve(PROJECT_ROOT, filePath);
  const docsDir = path.resolve(PROJECT_ROOT, 'docs');
  if (!absolutePath.startsWith(docsDir + path.sep) && absolutePath !== docsDir) {
    return Response.json(
      { error: '허용되지 않는 경로입니다' },
      { status: 403 }
    );
  }

  // 3. 파일 존재 확인 및 읽기
  try {
    const stat = await fs.stat(absolutePath);

    if (!stat.isFile()) {
      return Response.json(
        { error: '파일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    let content = await fs.readFile(absolutePath, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');
    let truncated = false;

    // 4. 크기 제한
    if (size > MAX_FILE_SIZE) {
      content = content.slice(0, MAX_FILE_SIZE);
      truncated = true;
    }

    const filename = path.basename(absolutePath);

    return Response.json({
      content,
      filename,
      size,
      ...(truncated && { truncated: true, warning: '파일이 100KB를 초과하여 잘렸습니다' }),
    });
  } catch {
    return Response.json(
      { error: '파일을 찾을 수 없습니다' },
      { status: 404 }
    );
  }
}
