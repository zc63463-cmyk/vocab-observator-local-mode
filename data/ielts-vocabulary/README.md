# 雅思词汇（IELTS Vocabulary）

本目录存放雅思词汇笔记的 Markdown 源文件，可直接通过本地脚本导入数据库，也可后续推送到 GitHub 仓库走常规同步流程。

## 文件命名

- 每个单词一个 `.md` 文件
- 文件名使用小写单词本身，如 `abandon.md`、`inevitable.md`
- 文件使用 UTF-8 编码

## 笔记格式

参考同目录下的 `.template.md` 模板。核心结构：

1. **YAML Frontmatter**（顶部 `---` 包裹的元数据）
   - `title`: 单词原形
   - `tags`: 分类标签
   - `semantic_field`: 语义场（决定 dashboard 网络图中的节点颜色）
   - `word_freq`: 固定写 **"雅思词汇"**
   - `date`: 创建日期（ISO 格式）

2. **正文结构**（必须包含的章节）
   - `# 单词` — 标题
   - `## 核心释义` — 主要含义（决定 short_definition）
   - `## 搭配与短语` — 短语搭配（可选）
   - `## 真题/语料关联` — 例句（可选）
   - `## 同义词辨析` — 同义词对比表（可选）
   - `## 反义词` — 反义词列表（可选）
   - `## 词根词缀` / `## 词义链路` / `## 记忆锚点` / `## 派生词链接` / `## 词性转换` — 扩展内容（可选）

## 导入方式

### 方式一：本地直接导入（不经过 GitHub）

```bash
npx tsx scripts/import-local-ielts.ts
```

该脚本会扫描本目录下所有 `.md` 文件，解析后写入本地 PostgreSQL 数据库。

### 方式二：Obsidian → GitHub → 自动同步

1. 将本目录中的 `.md` 文件移动到 Obsidian 仓库的 `Wiki/L1_雅思词汇/` 下
2. 推送到 GitHub
3. 调用 `/api/imports/github` 触发同步（或等待定时 cron 同步）

> **注意**：方式二需要确保 `lib/env.ts` 中的 `wordsPrefixes` 已包含 `"Wiki/L1_雅思词汇"`（已配置）。
