/**
 * 中英文文案词典。key 为扁平标识，值支持 {name} 占位符（见 settings.tsx 的 t()）。
 * 新增界面文案时必须同时补充 zh 与 en，两份 key 一一对应（类型上强制）。
 */
export type Lang = 'zh' | 'en';

const zh = {
  // 头部 / 通用
  'app.subtitle':
    '阅读（Legado）书源批量编辑：分组、名称、字段与去重，全部在浏览器内完成',
  'header.undo': '↩ 撤销上一步',
  'header.reupload': '重新上传',
  'header.download': '⬇ 下载 {name}',
  'header.langLabel': '界面语言',
  'header.themeLabel': '主题',
  'common.empty': '（空）',

  // 主题选项
  'theme.light': '☀️ 亮色',
  'theme.dark': '🌙 暗色',
  'theme.auto': '🖥️ 自动',

  // 已加载信息
  'loaded.info': '已加载 {name} · 共 {n} 条书源',
  'loaded.ops': '已应用 {n} 个操作',

  // 上传区
  'drop.aria': '上传书源 JSON 文件',
  'drop.title': '点击选择或拖入书源 JSON 文件',
  'drop.hint': '阅读 App 导出的书源数组（JSON Array），文件不会上传到任何服务器',
  'sample.button': '没有书源文件？载入示例数据体验 →',

  // 错误
  'err.jsonParse': 'JSON 解析失败：{msg}',
  'err.notArray': '文件顶层必须是书源数组（JSON Array）',
  'err.item': '第 {n} 项不是 JSON 对象',
  'err.sampleHttp': '示例数据请求失败（HTTP {status}）',

  // 功能卡（落地页）
  'feat.groups.desc': '将 bookSourceGroup 批量设为「作者@YYMMDD」',
  'feat.name.desc': '去符号/Emoji/#数字 后缀，重名自动编号并排序',
  'feat.custom.desc': '任意字段统一设值，支持文本/数字/布尔/JSON',
  'feat.dup.desc': '按书源 URL 域名分组，勾选保留、重命名',

  // 标签页 / 面板标题
  'tab.groups': '统一分组',
  'tab.name': '规范名称',
  'tab.custom': '自定义字段',
  'tab.dup': '交互去重',

  // 页脚
  'footer.text': '纯浏览器处理，数据不出本机 · 重写自 Go CLI 版 bsk-go · MIT',

  // 统一分组
  'groups.desc': '将所有书源的 bookSourceGroup 统一设为「作者@日期」格式，日期取今天（YYMMDD）。',
  'groups.author': '作者名',
  'groups.authorHint': '留空则用默认「Zephyr」',
  'groups.preview': '将生成分组：',
  'groups.today': '（今天 {date}）',
  'groups.apply': '应用到全部 {n} 条',
  'groups.done': '已将 {n} 条书源的分组设为 {group}',

  // 规范名称
  'name.desc': '依次去除首尾符号、移除 Emoji、去掉 #数字 后缀并修剪空白，随后对重名自动编号、按名称排序。',
  'name.symbols': '要去除的首尾符号',
  'name.symbolsHint': '输入后回车添加，可多个，如《 》【 】',
  'name.symbolsPlaceholder': '例如 《 》',
  'name.statChanged': '名称将改变',
  'name.statTotal': '书源总数',
  'name.statNumbered': '重名编号',
  'name.diffTitle': '处理前后对照',
  'name.showUnchanged': '显示未变化的项',
  'name.noChange': '当前设置下没有名称需要改变。',
  'name.apply': '应用规范化',
  'name.done': '已完成规范化：{n} 条名称发生变化，并按名称重新排序。',
  'name.editHint': '点击可直接编辑新名称',
  'name.editLabel': '编辑第 {n} 项的新名称',
  'name.resetEdits': '重置编辑',
  'name.edited': '已手动编辑 {n} 项',

  // 自定义字段
  'custom.desc': '将所有书源的指定字段统一设为某个值。默认按「文本」写入（与 Go CLI 一致），也可选数字 / 布尔 / JSON 类型。',
  'custom.key': '字段名',
  'custom.keyHint': '如 bookSourceGroup、weight',
  'custom.keyPlaceholder': '字段名',
  'custom.type': '值类型',
  'custom.value': '值',
  'custom.valuePlaceholder': '要写入的值',
  'custom.jsonPlaceholder': '{"key":"value"} 或 [1,2,3]',
  'custom.typeText': '文本',
  'custom.typeNumber': '数字',
  'custom.typeBoolean': '布尔',
  'custom.typeJson': 'JSON',
  'custom.errNumber': '不是合法数字',
  'custom.errJson': 'JSON 格式错误',
  'custom.willWrite': '将写入 {key} = {value}',
  'custom.noKey': '（未填字段名）',
  'custom.apply': '应用到全部 {n} 条',
  'custom.done': '已为 {n} 条书源设置字段 {key}',

  // 交互去重
  'dup.desc': '按 bookSourceUrl 的域名分组，域名唯一的书源自动保留；重复的分组请勾选要保留的条目（可重命名、展开查看发现页规则），未勾选的将被移除。',
  'dup.done': '已完成去重：保留 {kept} 条、移除 {removed} 条，当前共 {total} 条书源。',
  'dup.noDupAfter': '当前数据中没有重复域名，如需继续处理请撤销或重新上传。',
  'dup.noDup': '未发现重复书源：{n} 条书源的域名均唯一，无需处理。',
  'dup.statGroups': '重复组',
  'dup.statItems': '涉及条目',
  'dup.statKeep': '将保留',
  'dup.statRemove': '将移除',
  'dup.ungrouped': '有 {n} 条书源缺少有效的 bookSourceUrl，无法按域名去重，应用时会自动原样保留。',
  'dup.count': '{n} 条',
  'dup.selectAll': '全选',
  'dup.selectNone': '全不选',
  'dup.keepItem': '保留第 {n} 项',
  'dup.noName': '（无名称）',
  'dup.hasExplore': '有发现页',
  'dup.renamePlaceholder': '重命名（可选，留空保留原名称）',
  'dup.exploreSummary': '查看发现页规则（exploreUrl）',
  'dup.exploreNone': '（无）',
  'dup.barSummary': '保留 {kept} 条 · 移除 {removed} 条 · 共 {groups} 组',
  'dup.apply': '应用去重',

  // 组件
  'tag.remove': '移除 {tag}',
} as const;

export type MessageKey = keyof typeof zh;

const en: Record<MessageKey, string> = {
  'app.subtitle':
    'Batch editing for Legado book sources: groups, names, fields & dedup — all in your browser',
  'header.undo': '↩ Undo',
  'header.reupload': 'Re-upload',
  'header.download': '⬇ Download {name}',
  'header.langLabel': 'UI language',
  'header.themeLabel': 'Theme',
  'common.empty': '(empty)',

  'theme.light': '☀️ Light',
  'theme.dark': '🌙 Dark',
  'theme.auto': '🖥️ Auto',

  'loaded.info': 'Loaded {name} · {n} sources',
  'loaded.ops': '{n} operations applied',

  'drop.aria': 'Upload a book-source JSON file',
  'drop.title': 'Click or drop a book-source JSON file',
  'drop.hint': 'A JSON array exported by the Legado app — files never leave your device',
  'sample.button': 'No file yet? Load sample data →',

  'err.jsonParse': 'JSON parse error: {msg}',
  'err.notArray': 'Top level of the file must be a JSON array',
  'err.item': 'Item {n} is not a JSON object',
  'err.sampleHttp': 'Failed to fetch sample data (HTTP {status})',

  'feat.groups.desc': 'Set every bookSourceGroup to Author@YYMMDD',
  'feat.name.desc': 'Strip symbols/emoji/#number, number duplicates, sort',
  'feat.custom.desc': 'Set any field — text / number / boolean / JSON',
  'feat.dup.desc': 'Group by URL host; keep & rename interactively',

  'tab.groups': 'Groups',
  'tab.name': 'Names',
  'tab.custom': 'Fields',
  'tab.dup': 'Dedup',

  'footer.text':
    'Processed in your browser — data never leaves your device · Rewritten from the Go CLI bsk-go · MIT',

  'groups.desc': 'Set every bookSourceGroup to "Author@Date" (today, YYMMDD).',
  'groups.author': 'Author',
  'groups.authorHint': 'Leave empty for the default "Zephyr"',
  'groups.preview': 'Group to generate:',
  'groups.today': '(today {date})',
  'groups.apply': 'Apply to all {n}',
  'groups.done': 'Set group to {group} on {n} sources',

  'name.desc': 'Strip leading/trailing symbols, emoji and #number suffixes, trim whitespace, then auto-number duplicates and sort by name.',
  'name.symbols': 'Symbols to strip',
  'name.symbolsHint': 'Press Enter to add, e.g. 《 》【 】',
  'name.symbolsPlaceholder': 'e.g. 《 》',
  'name.statChanged': 'Names changing',
  'name.statTotal': 'Total sources',
  'name.statNumbered': 'Numbered dups',
  'name.diffTitle': 'Before / after diff',
  'name.showUnchanged': 'Show unchanged',
  'name.noChange': 'No names would change with the current settings.',
  'name.apply': 'Apply normalization',
  'name.done': 'Done: {n} names changed, re-sorted by name.',
  'name.editHint': 'Click to edit the new name',
  'name.editLabel': 'Edit new name for item {n}',
  'name.resetEdits': 'Reset edits',
  'name.edited': '{n} items manually edited',

  'custom.desc': 'Set one field on all sources to a unified value. Text by default (same as the Go CLI); number / boolean / JSON also supported.',
  'custom.key': 'Field name',
  'custom.keyHint': 'e.g. bookSourceGroup, weight',
  'custom.keyPlaceholder': 'Field name',
  'custom.type': 'Value type',
  'custom.value': 'Value',
  'custom.valuePlaceholder': 'Value to set',
  'custom.jsonPlaceholder': '{"key":"value"} or [1,2,3]',
  'custom.typeText': 'Text',
  'custom.typeNumber': 'Number',
  'custom.typeBoolean': 'Boolean',
  'custom.typeJson': 'JSON',
  'custom.errNumber': 'Not a valid number',
  'custom.errJson': 'Invalid JSON',
  'custom.willWrite': 'Will set {key} = {value}',
  'custom.noKey': '(no field name)',
  'custom.apply': 'Apply to all {n}',
  'custom.done': 'Set field {key} on {n} sources',

  'dup.desc': 'Sources are grouped by the host of bookSourceUrl; unique hosts are kept automatically. In duplicate groups, check the entries to keep (rename or inspect explore rules as needed) — unchecked entries are removed.',
  'dup.done': 'Done: kept {kept}, removed {removed}; {total} sources remain.',
  'dup.noDupAfter': 'No duplicate hosts in the current data; undo or re-upload to continue.',
  'dup.noDup': 'No duplicates: all {n} sources have unique hosts.',
  'dup.statGroups': 'Duplicate groups',
  'dup.statItems': 'Items involved',
  'dup.statKeep': 'To keep',
  'dup.statRemove': 'To remove',
  'dup.ungrouped': '{n} sources have no valid bookSourceUrl and cannot be grouped by host; they are kept as-is.',
  'dup.count': '{n} items',
  'dup.selectAll': 'Keep all',
  'dup.selectNone': 'Keep none',
  'dup.keepItem': 'Keep item {n}',
  'dup.noName': '(no name)',
  'dup.hasExplore': 'has explore',
  'dup.renamePlaceholder': 'Rename (optional, empty keeps the original)',
  'dup.exploreSummary': 'Explore rules (exploreUrl)',
  'dup.exploreNone': '(none)',
  'dup.barSummary': 'Keep {kept} · Remove {removed} · {groups} groups',
  'dup.apply': 'Apply dedup',

  'tag.remove': 'Remove {tag}',
};

export const messages: Record<Lang, Record<MessageKey, string>> = { zh, en };
