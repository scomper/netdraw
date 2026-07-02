#!/usr/bin/env python3
"""
NetDraw AI 拓扑图识别调试脚本
用法：python3 test-ai-topo.py --key sk-xxx [图片路径]

默认使用通义千问 qwen-vl-max，和 NetDraw 中的逻辑完全一致。
输出 AI 原始返回 + 坐标碰撞检测 + 简要统计。
"""
import argparse, base64, json, os, sys
from pathlib import Path

try:
    from PIL import Image
    import requests
except ImportError:
    print("需要安装依赖：pip install Pillow requests --break-system-packages")
    sys.exit(1)

# === 和 netdraw.html 完全一致的 TOPO_PROMPT ===
TOPO_PROMPT = r"""你是 NetDraw 网络拓扑图生成引擎。根据用户的文字描述或上传的拓扑图片，输出可直接导入编辑器的 JSON 数据。

## 识别策略

1. 找出所有设备节点（有图标的实体），如实提取图中的设备名称、IP、型号等文字信息
2. 注意区分：设备节点 vs 纯文字标签（如"运营商"、"互联网"只是标签，不是设备节点）
3. 找出所有分组/安全域边界（用虚线框、背景色块、文字标签标识），记录名称和包含的设备ID
4. 找出所有实际的连线关系，没有连线的设备保持独立
5. **保留原图的空间位置**：根据图中设备的相对位置，按比例分配 x/y 坐标

## 输出格式

只输出合法 JSON，不要任何解释文字或 Markdown 标记。

{
  "title": "拓扑图标题",
  "nodes": [
    {
      "id": "唯一标识（小写英文+数字）",
      "label": "设备名称",
      "type": "设备类型",
      "x": 水平坐标（20的整数倍，保留原图中设备的相对左右位置）,
      "y": 垂直坐标（20的整数倍，保留原图中设备的相对上下位置）,
      "fields": [
        {"label": "字段名", "value": "字段值"}
      ]
    }
  ],
  "edges": [
    {
      "source": "源设备id",
      "target": "目标设备id",
      "label": "链路描述（可选）",
      "variant": "default|emphasis|security|async"
    }
  ],
  "groups": [
    {
      "name": "分组名称",
      "devices": ["设备id1", "设备id2"]
    }
  ]
}

## 设备类型枚举

type 必须为以下之一，必须对应实际设备角色：
modem(光猫/ONT) | router(路由器) | switch(交换机) | ap(无线AP) | cam(摄像头) | nvr(录像机) | nas(存储) | security(安全设备) | firewall(防火墙) | server(服务器/VM) | database(数据库) | desktop(台式机) | laptop(笔记本) | phone(手机) | gateway(用户/人员) | cloud(云服务/SaaS) | custom(自定义)

## 关键规则

1. **位置还原**：根据图中设备的相对位置分配 x/y 坐标。同层设备水平排列，上下层设备垂直排列，保留原图的空间关系。
2. **连线规则**：只连接有实际连线关系的设备。没有连线的设备保持独立。
3. **字段填写**：如实提取图中可见的 IP、型号、端口等信息，不要编造。
4. **分组识别**：分组用虚线框、背景色块标识。每个分组记录名称和包含的设备ID列表。"""

PRESETS = {
    "qwen":  {"endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1", "model": "qwen-vl-max", "name": "通义千问"},
    "doubao": {"endpoint": "https://ark.cn-beijing.volces.com/api/v3", "model": "doubao-1.5-vision-pro-32k", "name": "豆包"},
    "openai": {"endpoint": "https://api.openai.com/v1", "model": "gpt-4o", "name": "OpenAI"},
}

VALID_TYPES = {"modem","router","switch","ap","cam","nvr","nas","security","firewall","server","database","desktop","laptop","phone","gateway","cloud","custom"}


def encode_image(path, max_size=1600, quality=0.85):
    """和 netdraw.html processAIFile 完全一致的压缩逻辑"""
    img = Image.open(path)
    w, h = img.size
    if w > max_size or h > max_size:
        r = max_size / max(w, h)
        w, h = round(w * r), round(h * r)
        img = img.resize((w, h), Image.LANCZOS)
    # 转 JPEG
    import io
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=int(quality * 100))
    b64 = base64.b64encode(buf.getvalue()).decode()
    return b64, "image/jpeg", w, h


def call_api(endpoint, key, model, image_b64, mime, w, h):
    """完全复制 netdraw.html callAI 的请求结构"""
    messages = [
        {"role": "system", "content": TOPO_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                {"type": "text", "text": "请识别这张网络拓扑图，提取所有设备和连接关系，生成对应的拓扑数据。"}
            ]
        }
    ]
    url = endpoint.rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 4096,
        "temperature": 0.1
    }
    print(f"调用 {endpoint} | model={model} | 图片 {w}x{h}")
    print(f"请求 payload 大小: {len(json.dumps(payload, ensure_ascii=False))//1024}KB")
    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    if resp.status_code != 200:
        print(f"API 错误 {resp.status_code}: {resp.text[:500]}")
        sys.exit(1)
    data = resp.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return text, usage


def validate_result(data):
    """验证 AI 返回的结构和坐标质量"""
    issues = []
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    groups = data.get("groups", [])

    if not nodes:
        issues.append("❌ 没有节点")
        return issues

    node_ids = {n.get("id") for n in nodes if n.get("id")}

    # 坐标验证
    has_coords = any(n.get("x") is not None and n.get("y") is not None for n in nodes)
    if not has_coords:
        issues.append("⚠️  没有节点返回 x/y 坐标（将使用层级布局）")
    else:
        for i, n in enumerate(nodes):
            x, y = n.get("x"), n.get("y")
            if x is None or y is None:
                issues.append(f"⚠️  node[{i}] '{n.get('label')}' 缺少 x 或 y")
            elif x % 20 != 0 or y % 20 != 0:
                issues.append(f"⚠️  node[{i}] '{n.get('label')}' 坐标未对齐20px网格: ({x},{y})")

    # 类型验证
    for i, n in enumerate(nodes):
        if n.get("type") not in VALID_TYPES:
            issues.append(f"⚠️  node[{i}] type={n.get('type')} 不在枚举中")
        if not n.get("id"):
            issues.append(f"⚠️  node[{i}] 缺少 id 字段")

    # 碰撞检测
    HW, HH = 80, 29
    for i in range(len(nodes)):
        for j in range(i+1, len(nodes)):
            a, b = nodes[i], nodes[j]
            ax, ay = a.get("x"), a.get("y")
            bx, by = b.get("x"), b.get("y")
            if ax is None or ay is None or bx is None or by is None:
                continue
            dx, dy = abs(ax - bx), abs(ay - by)
            if dx < HW * 2 and dy < HH * 2:
                issues.append(f"💥 碰撞! '{a['label']}'({ax},{ay}) ↔ '{b['label']}'({bx},{by})")

    # 边引用验证
    for i, e in enumerate(edges):
        src, tgt = e.get("source"), e.get("target")
        if not src or not tgt:
            issues.append(f"❌ edge[{i}] source/target 缺失")
        else:
            if src not in node_ids:
                issues.append(f"❌ edge[{i}] source='{src}' 不存在于 nodes 中")
            if tgt not in node_ids:
                issues.append(f"❌ edge[{i}] target='{tgt}' 不存在于 nodes 中")

    # 分组验证
    for i, g in enumerate(groups):
        devices = g.get("devices", [])
        if not devices:
            issues.append(f"⚠️  group[{i}] '{g.get('name')}' devices 为空")
        else:
            for dev_id in devices:
                if dev_id not in node_ids:
                    issues.append(f"⚠️  group[{i}] '{g.get('name')}' devices 中的 '{dev_id}' 不存在于 nodes 中")

    # 孤立节点
    connected = set()
    for e in edges:
        connected.add(e.get("source"))
        connected.add(e.get("target"))
    isolated = [n for n in nodes if n.get("id") not in connected]
    if isolated:
        issues.append(f"ℹ️  有 {len(isolated)} 个孤立节点: {[n.get('label') for n in isolated[:5]]}")

    return issues


def main():
    parser = argparse.ArgumentParser(description="NetDraw AI 拓扑识别调试")
    parser.add_argument("image", nargs="?", help="拓扑图图片路径")
    parser.add_argument("--key", required=True, help="API Key")
    parser.add_argument("--endpoint", default=None, help="API 端点 (默认通义千问)")
    parser.add_argument("--model", default=None, help="模型名 (默认 qwen-vl-max)")
    parser.add_argument("--preset", choices=list(PRESETS.keys()), default="qwen", help="预设模型")
    parser.add_argument("--text", default=None, help="纯文字描述（不传图片）")
    parser.add_argument("--save", default=None, help="保存 AI 返回 JSON 到文件")
    args = parser.parse_args()

    preset = PRESETS[args.preset]
    endpoint = args.endpoint or preset["endpoint"]
    model = args.model or preset["model"]

    if args.text:
        # 纯文字模式
        messages = [
            {"role": "system", "content": TOPO_PROMPT},
            {"role": "user", "content": [{"type": "text", "text": args.text}]}
        ]
        url = endpoint.rstrip("/") + "/chat/completions"
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {args.key}"}
        payload = {"model": model, "messages": messages, "max_tokens": 4096, "temperature": 0.1}
        print(f"调用 {endpoint} | model={model} | 文字模式")
        resp = requests.post(url, headers=headers, json=payload, timeout=120)
        if resp.status_code != 200:
            print(f"API 错误 {resp.status_code}: {resp.text[:500]}"); sys.exit(1)
        data = resp.json()
        raw_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
    elif args.image:
        img_path = args.image
        if not os.path.isfile(img_path):
            print(f"文件不存在: {img_path}"); sys.exit(1)
        b64, mime, w, h = encode_image(img_path)
        raw_text, usage = call_api(endpoint, args.key, model, b64, mime, w, h)
    else:
        parser.error("需要提供图片路径或 --text 参数")

    # 输出用量
    print(f"\n{'='*60}")
    print(f"Token 用量: prompt={usage.get('prompt_tokens','?')}, completion={usage.get('completion_tokens','?')}, total={usage.get('total_tokens','?')}")
    print(f"{'='*60}")

    # 提取 JSON
    import re
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw_text)
    json_str = m.group(1).strip() if m else raw_text.strip()

    # 尝试修复常见 JSON 问题
    try:
        result = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"\n❌ JSON 解析失败: {e}")
        print(f"\n--- AI 原始返回 (前 2000 字) ---\n{raw_text[:2000]}")
        if args.save:
            Path(args.save).write_text(raw_text, encoding="utf-8")
            print(f"\n原始文本已保存到: {args.save}")
        sys.exit(1)

    # 统计
    nodes = result.get("nodes", [])
    edges = result.get("edges", [])
    groups = result.get("groups", [])
    has_coords = any(n.get("x") is not None and n.get("y") is not None for n in nodes)
    print(f"\n✅ JSON 解析成功")
    print(f"   标题: {result.get('title','?')}")
    print(f"   节点: {len(nodes)} | 连线: {len(edges)} | 分组: {len(groups)} | 坐标: {'有' if has_coords else '无（层级布局）'}")
    if nodes:
        print(f"   节点列表:")
        for i, n in enumerate(nodes):
            filled = sum(1 for f in n.get("fields", []) if f.get("value"))
            x, y = n.get("x"), n.get("y")
            coord = f"({x:5d},{y:5d})" if x is not None and y is not None else "(  层级布局)"
            print(f"     [{i:2d}] {n['type']:10s} {n['label']:<30s} {coord} {filled}字段")
    if groups:
        print(f"   分组列表:")
        for i, g in enumerate(groups):
            devices = g.get("devices", [])
            print(f"     [{i}] {g.get('name','?')}: {len(devices)} 个设备")

    # 碰撞检测
    issues = validate_result(result)
    if issues:
        print(f"\n⚠️  发现 {len(issues)} 个问题:")
        for iss in issues:
            print(f"   {iss}")
    else:
        print(f"\n✅ 无碰撞、无引用错误")

    # 保存
    if args.save:
        Path(args.save).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n结果已保存到: {args.save}")

    # 输出完整 JSON 供直接粘贴
    print(f"\n--- AI 返回的完整 JSON ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
