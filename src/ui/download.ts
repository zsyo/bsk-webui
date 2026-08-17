/** 触发浏览器下载一个文本文件。 */
export function downloadText(
  filename: string,
  content: string,
  mime = 'application/json',
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 与 Go CLI 一致的输出文件名：<原名>_new.json（已带 _new 则不重复追加）。 */
export function outputFileName(inputName: string): string {
  const ext = inputName.slice(inputName.lastIndexOf('.')) || '';
  const base = ext
    ? inputName.slice(0, -ext.length)
    : inputName;
  const stem = base.endsWith('_new') ? base.slice(0, -4) : base;
  return `${stem}_new${ext || '.json'}`;
}
