#!/usr/bin/env bash
# check-security.sh - NetDraw 预发布安全扫描
# 检查 HTML 文件中是否包含真实网络拓扑数据、敏感信息等
# 用法: bash check-security.sh [file]
# 退出码: 0=通过, 1=发现安全问题

set -uo pipefail

FILE="${1:-netdraw.html}"
ERRORS=0

if [ ! -f "$FILE" ]; then
  echo "❌ 文件不存在: $FILE"
  exit 1
fi

echo "🔒 NetDraw 安全扫描: $FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 提取 loadDefaultTopology 函数内容用于检查（只取函数体，排除注释和安全自检代码）
TOPO_DATA=$(sed -n '/function loadDefaultTopology/,/^}/p' "$FILE" 2>/dev/null | grep -v '^\s*//' | grep -v 'SECURITY' | grep -v 'console\.' | grep -v 'hasBrand\|hasIP\|topoFunc\|match(' || true)

# 1. 检查 loadDefaultTopology 中是否有内网 IP
echo -n "[1/5] 检查默认拓扑中的内网 IP... "
TOPO_IPS=$(echo "$TOPO_DATA" | grep -oE '(10\.[0-9]+\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+|192\.168\.[0-9]+\.[0-9]+)' 2>/dev/null | grep -v '192\.168\.1\.x' | grep -v '127\.0\.0\.1' || true)
if [ -n "$TOPO_IPS" ]; then
  echo "⚠️  发现真实内网 IP:"
  echo "$TOPO_IPS" | sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
else
  echo "✅ 通过"
fi

# 2. 检查 loadDefaultTopology 中是否有真实公网 IP
echo -n "[2/5] 检查默认拓扑中的公网 IP... "
TOPO_PUBLIC=$(echo "$TOPO_DATA" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' 2>/dev/null | grep -v '127\.0\.0\.1' | grep -v '0\.0\.0\.0' || true)
if [ -n "$TOPO_PUBLIC" ]; then
  echo "⚠️  默认拓扑中发现真实 IP:"
  echo "$TOPO_PUBLIC" | sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
else
  echo "✅ 通过"
fi

# 3. 检查 loadDefaultTopology 中是否有真实品牌/设备名
echo -n "[3/5] 检查默认拓扑中的设备名... "
FOUND_BRANDS=$(echo "$TOPO_DATA" | grep -ioE 'H3C|华为|Huawei|Cisco|思科|TpLink|TP-Link|群晖|Synology|奇安信|深信服|锐捷|Ruijie|中兴|ZTE|Hikvision|海康|Dahua|大华' 2>/dev/null | sort -u || true)
if [ -n "$FOUND_BRANDS" ]; then
  echo "⚠️  发现真实品牌/设备名:"
  echo "$FOUND_BRANDS" | sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
else
  echo "✅ 通过"
fi

# 4. 检查 loadDefaultTopology 是否为空（节点数=0）
echo -n "[4/5] 检查默认拓扑是否为空画布... "
NODE_LINES=$(echo "$TOPO_DATA" | grep -c "id:" 2>/dev/null || true)
EDGE_LINES=$(echo "$TOPO_DATA" | grep -c "source:" 2>/dev/null || true)
# 去掉函数定义行本身可能的匹配
TOTAL=$((NODE_LINES + EDGE_LINES))
if [ "$TOTAL" -gt 0 ]; then
  echo "⚠️  默认拓扑包含数据（应为空画布）"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ 通过 (空白画布)"
fi

# 5. 全文检查：是否有注释中泄露的真实信息（开发备注等）
echo -n "[5/5] 检查注释中的敏感信息... "
SENSITIVE=$(grep -inE 'TODO.*密码|FIXME.*key|HACK|公司内部|内部地址|真实IP|生产环境' "$FILE" 2>/dev/null || true)
if [ -n "$SENSITIVE" ]; then
  echo "⚠️  发现可疑注释:"
  echo "$SENSITIVE" | sed 's/^/    /'
  ERRORS=$((ERRORS + 1))
else
  echo "✅ 通过"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -gt 0 ]; then
  echo "❌ 安全扫描未通过！发现 $ERRORS 个问题，请修复后再发布。"
  exit 1
else
  echo "✅ 安全扫描通过，可以发布。"
  exit 0
fi
