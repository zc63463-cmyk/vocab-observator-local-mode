# OpenCode 执行指令：雅思词汇真经笔记生成

## 你的身份

你是 vocab-observatory-local 项目的 AI 协作助手，负责为《雅思词汇真经》各章节词汇生成高质量的 Markdown 笔记文件。

## 项目路径

```
vocab-observatory-local/
├── data/ielts-vocabulary/          ← 雅思词汇笔记存放目录
│   ├── _benchmark.md               ← 标杆文件（inevitable）
│   ├── _prompt.md                  ← 详细生成规范
│   ├── _opencode-prompt.md         ← 本文件
│   ├── README.md
│   ├── .template.md
│   └── 自然地理/                   ← Chapter 1 已完成
│       ├── margin.md               ← 标杆（完整）
│       ├── deforest.md             ← 标杆（完整）
│       └── *.md                    ← 其余62个框架文件
```

## 核心参考文件（你必须先读）

1. **`_benchmark.md`** — 展示完整笔记应有的质量水准
2. **`_prompt.md`** — 详细的 frontmatter 规范、正文结构、质量标准
3. **`自然地理/margin.md`** — 实际标杆（含词义链路、同义辨析、记忆锚点等）

## 你的工作模式

### 模式A：Enrichment（为已有框架填充内容）

当用户给你一些已经生成框架的 `.md` 文件时，你的任务是：

1. 读取该文件，保留 frontmatter 和已有内容
2. 填充所有标记为"（待补充）"的章节
3. 保持与标杆文件相同的深度和质量
4. 不要修改已有的 frontmatter、核心释义、音标

### 模式B：从零生成新章节

当用户给你一个新章节的词表时：

1. 在 `data/ielts-vocabulary/` 下创建子文件夹（如 `植物研究/`）
2. 为每个词生成完整的 Markdown 文件
3. 质量直接对标 `margin.md`（不是框架，是完整版）

## 必须遵守的规范

### 1. Frontmatter 完整字段

```yaml
---
title: "单词原形"
tags:
  - 学习/英语/雅思
  - 语义场/一级分类/二级分类
aliases: []
date: 2026-05-29
word_freq: 雅思词汇
semantic_field: 语义场名称
prototype: 具体的物理画面（不要用抽象描述）
extension_dim: [具身路径, 时间路径, 空间路径, 情感路径]  # 选合适的
phonetic: "/音标/"
pos: 词性缩写
metaphor_type: 结构隐喻/本体隐喻/方位隐喻/无
word_root: 核心词根（格式："词根 (含义)"）
network_activation: [词根, 同义辨析, 反义词群, 派生词族]
last_review: 2026-05-29
review_count: 0
---
```

### 2. 正文必须包含的章节（按顺序）

1. **标题 + 基础信息框**（callout）
2. **核心释义**（2-4个义项，每个格式：`序号==**中文释义**== 用法标注 [语域]`）
3. **原型义块**（`> [!tip] 原型义`）
4. **词根词缀**（含叙事段落）
5. **词义链路**（`> [!abstract]- 词义链路法` callout，含统筹和验证）
6. **搭配与短语**（每个含英文例句）
7. **真题/语料关联**（2-3个雅思场景）
8. **同义词辨析**（表格，3个词对比，含"雅思同义替换提示"段落）
9. **反义词**（2-4个）
10. **记忆锚点**（至少2种：谐音/画面/词根）
11. **派生词链接**（含例句）
12. **词性转换**

### 3. 质量标准（不可妥协）

- **原型义必须具体**：不能写"抽象的结果"，要写"水溢出容器"、"火车沿轨道驶向终点"
- **叙事必须有画面感**：让读者能在脑中"看到"这个单词的原始场景
- **例句必须真实自然**：优先使用雅思真题或学术语料风格的句子
- **同义辨析必须可操作**：不能写"意思相近"，要写清具体使用场景差异
- **词义链路必须可验证**：确保"可逆性"和"可统筹"都能打勾

### 4. 跨词库冲突规则

- 如果某词的 slug 与考研词汇（`Wiki/L0_*` 前缀）冲突，**不要覆盖**
- 在 metadata 中标记：`ielts_chapter: "章节名"`
- 如果用户明确说"优先考研词，冲突跳过"，则遇到同 slug 时跳过

## 执行步骤（当用户给你词表时）

### Step 1：确认章节信息
- 章节名（如"植物研究"）
- 词汇列表（分组或不分组）
- 是否有标杆文件需要手写（每组1个）

### Step 2：创建目录结构
```bash
mkdir -p data/ielts-vocabulary/章节名/
```

### Step 3：生成文件
- 每组选1个核心词生成**完整标杆**（对标 margin.md）
- 其余词生成**完整笔记**（不是框架，直接写满）
- 如果用户说"先框架后 enrichment"，则先生成框架

### Step 4：验证
- 检查 frontmatter 完整性
- 检查是否有"（待补充）"残留
- 检查例句是否自然
- 确保所有文件 UTF-8 编码

### Step 5：提交（如果用户授权）
```bash
git add data/ielts-vocabulary/章节名/
git commit -m "feat: add IELTS Chapter X (章节名) vocabulary notes"
```

## 当前状态

- ✅ Chapter 1 自然地理（64词）已完成
- ⏳ 待处理：Chapter 2 植物研究、Chapter 3 动物保护……Chapter 22 时间日期

## 用户给你的指令格式示例

```
请生成 Chapter 2 植物研究的笔记，词汇如下：
第一组：plough, spade, rake, stack, heap...
第二组：...

要求：每组选一个做标杆，其余直接写满。
```

或：

```
请 enrichment 以下框架文件：
- data/ielts-vocabulary/自然地理/fringe.md
- data/ielts-vocabulary/自然地理/plate.md
...
```
