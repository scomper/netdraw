# Changelog

All notable changes to NetDraw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-07-02

### Added
- 设备面板三态自适应（full / compact / mini），ResizeObserver 驱动
- 属性面板支持头部拖拽移动
- 画布删除防呆设计（点击变红闪烁，3 秒内再点删除）
- 新建画布不再创建缺省节点
- 打开文件内容自动居中（fitView）
- 导入文件兼容 `position:{x,y}` 格式（自动迁移为扁平 x/y）
- 全选删除时同步清理分组
- AI 模型页面新增密钥安全说明（点击 `?` 查看）
- 统一版本号机制（`NETDRAW_VERSION` / `NETDRAW_RELEASE` 常量）
- 帮助对话框动态显示版本号和发布时间
- 本文件（CHANGELOG.md）

### Changed
- 所有 emoji 替换为 Feather 风格 SVG 线条图标
- 设备面板标题去除图标，与属性面板风格统一
- 拖拽吸附后保存精确宽度到 localStorage，修复刷新后宽度漂移
- 面板初始化隐藏再显示，消除首帧闪烁
- 工具条标题框固定高度，中英文切换不再跳动
- 对象模板为空时整个分类自动隐藏
- 新建画布不创建缺省节点

### Fixed
- 打开文件后画布跳转和对象堆叠问题
- 全选删除不清理分组
- 面板宽度刷新后逐次变窄
- 面板闪烁和工具条高度跳动
- 导出 SVG 图标方向修正（向上箭头）
- 安全脱敏：office-topo.json、示例 JSON、deploy.sh
- 保存按钮无响应（customTypes 未定义导致 ReferenceError）
- 导出图片内容空白（clipPath 和 overflow:hidden 在 canvas 渲染中失效）
- 在线图标搜索无结果（tags.json 值为数组，旧代码按字符串匹配）
- 导入文件兼容 customPresets 和旧 customTypes 两种格式

### Security
- 示例拓扑文件全面脱敏（IP / MAC / 品牌 / 部门）
- deploy.sh 移除硬编码服务器信息，改为必填参数
- 添加 LICENSE（MIT）和 .gitignore

---

## [1.0.0] - 2026-07-01

### Added
- 核心绘图引擎（SVG + foreignObject）
- 17 种内置设备类型
- 自定义设备类型和对象模板
- 多画布管理
- AI 拓扑图识别（通义千问 / 豆包 / OpenAI / SiliconFlow / Ollama）
- 导出（PNG / SVG / JSON）
- 撤销 / 重做（50 步）
- 分组系统
- 自动排版（BFS 层级分析）
- 连线语义变体（4 种样式 + 动画）
- 暗色 / 亮色主题
- 属性面板（节点 / 连线 / 分组）
- 帮助对话框
- localStorage 持久化
