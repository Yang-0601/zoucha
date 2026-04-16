# 设计走查 · Design Review

> 设计稿与线上实现的像素级对比工具，支持 AI 自动分析差异、手动标注与报告导出。

<br/>

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| **多模式比对** | 并排 / 滑动 / 叠加（差值热图）/ 重叠 四种视角，从宏观布局到像素级对齐全覆盖 |
| **AI 自动分析** | 发送原始分辨率图片（上限 1200 px）给视觉模型，自动生成结构化差异标注 |
| **手动标注** | 三种标注样式，支持点选、矩形框选，可拖拽调整位置 |
| **差异管理** | 严重程度分级、修复状态跟踪、来源筛选（AI / 手动）、拖拽排序 |
| **报告导出** | 一键生成带标注的 PNG 或 PDF 走查报告，含相似度评分 |
| **项目管理** | 多项目 / 多版本管理，数据全部存储在本地 IndexedDB，无需后端 |
| **多 AI 模型** | 支持 Anthropic Claude、OpenAI GPT-4o、Google Gemini、智谱 GLM-4V 及任意 OpenAI 兼容接口 |

<br/>

## 🖥️ 界面预览

```
项目列表  →  版本列表  →  上传图片  →  走查工作台
                                         ├─ 画布（四种比对模式）
                                         ├─ 差异列表（左侧面板）
                                         └─ 详情编辑（右侧面板）
```

<br/>

## 🚀 快速开始

### 环境要求

- Node.js 18+
- 任意支持 WebGPU 的现代浏览器（Chrome 117+ 推荐）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Yang-0601/zoucha.git
cd zoucha

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### 构建生产版本

```bash
npm run build
npm start
```

> **无需任何环境变量或服务端配置。** API Key 在应用内的「AI 配置」弹窗中填写，存储在浏览器 localStorage，不会发送到任何第三方服务器（除 AI 提供商自身）。

<br/>

## 🤖 AI 模型配置

点击工作台右上角 **「AI 配置」** 按钮，添加以下任意一个（或多个）模型：

| 提供商 | 推荐模型 | 获取 API Key |
|--------|----------|-------------|
| **Anthropic** | `claude-3-5-sonnet-20241022` | [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | `gpt-4o` | [platform.openai.com](https://platform.openai.com) |
| **Google** | `gemini-2.5-pro-preview-05-06` | [aistudio.google.com](https://aistudio.google.com) |
| **智谱 AI** | `glm-4v-plus` | [open.bigmodel.cn](https://open.bigmodel.cn) |
| **自定义** | 任意 OpenAI 兼容模型 | 填写 Base URL 即可 |

> Gemini 2.5 系列支持深度推理（`thinkingConfig`），分析精度最高，推荐用于细粒度走查。

<br/>

## 🔧 技术栈

```
前端框架    Next.js 16 (App Router) + React 19
语言        TypeScript 5
样式        Tailwind CSS v4
状态管理    Zustand v5（persist 中间件 → localStorage）
本地存储    IndexedDB（项目、版本、标注数据）
图标        lucide-react
```

无外部 UI 组件库，无服务端数据库，无用户认证。所有数据均存储在用户本地浏览器中。

<br/>

## 📁 项目结构

```
src/
├── app/                        # Next.js App Router 页面
│   ├── page.tsx                # 项目列表首页
│   ├── project/[id]/           # 版本列表页
│   │   └── version/[vid]/      # 上传页 & 工作台
│   └── workbench/              # 独立工作台（无项目上下文）
├── components/
│   ├── projects/               # 项目列表、版本列表组件
│   ├── workbench/              # 工作台核心：画布、工具栏、面板
│   └── shared/                 # 公共弹窗（AI 配置、报告、使用手册）
├── lib/
│   ├── ai/                     # AI 分析：providers、prompt、index
│   └── db.ts                   # IndexedDB 封装
├── store/
│   └── index.ts                # Zustand 全局状态
└── types/
    └── index.ts                # 全局类型定义
```

<br/>

## 🔑 核心工作流

1. **创建项目** → 在项目列表点击「新建项目」，填写名称后留在列表页
2. **创建版本** → 进入项目后点击「新建验收」，填写版本名后留在版本列表
3. **上传图片** → 点击版本进入上传页，分别上传设计稿与线上截图，选择目标宽度
4. **AI 分析** → 在工作台点击「AI 分析」，等待模型返回差异列表
5. **手动补充** → 开启标注模式，在画布上点击 / 框选补充遗漏差异
6. **核对修复** → 在差异列表标记每条差异的修复状态（待处理 / 已修复 / 忽略）
7. **导出报告** → 点击「导出报告」生成 PDF，交付给开发同学跟进

<br/>

## 📋 比对模式说明

| 模式 | 适用场景 | 特色操作 |
|------|---------|---------|
| **并排** | 整体布局、内容顺序 | 两图同步滚动缩放 |
| **滑动** | 局部细节对比 | 拖动分割线随意定位 |
| **叠加** | 颜色偏差、透明度 | 差值 / 热图混合模式 |
| **重叠** | 像素级间距校准 | 方向键微移，Shift 步进 10px |

<br/>

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `?` | 打开使用手册 |
| `Space` + 拖拽 | 平移画布 |
| 滚轮 | 以鼠标为中心缩放 |
| `Ctrl` + `R` | 切换标尺显示 |
| `↑↓←→` | 叠加/重叠模式下微移图层 1px |
| `Shift` + 方向键 | 步进移动 10px |
| `Esc` | 退出标注模式 / 取消选中 |
| `Delete` | 删除选中标注 |

<br/>

## 📄 开源协议

[MIT License](LICENSE)

---

<p align="center">
  Made with ☕ · 数据存储在本地，API Key 不经过任何中间服务器
</p>
