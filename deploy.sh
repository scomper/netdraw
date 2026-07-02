#!/usr/bin/env bash
# deploy.sh - NetDraw 安全部署脚本
# 自动运行安全扫描 → 部署到服务器
# 用法: bash deploy.sh <server_ip> <ssh_key>
# 退出码: 0=成功, 1=安全检查失败, 2=参数错误, 3=部署失败

set -euo pipefail

SERVER="${1:-}"
SSH_KEY="${2:-}"
REMOTE_PATH="${3:-/var/www/html/netdraw.html}"
LOCAL_FILE="$(dirname "$0")/netdraw.html"
SCAN_SCRIPT="$(dirname "$0")/check-security.sh"

if [ -z "$SERVER" ] || [ -z "$SSH_KEY" ]; then
  echo "用法: bash deploy.sh <server_ip> <ssh_key> [remote_path]"
  echo "示例: bash deploy.sh 192.0.2.1 ~/.ssh/id_rsa"
  exit 2
fi

echo "🚀 NetDraw 安全部署流程"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: 安全扫描
echo ""
echo "📋 Step 1: 安全扫描"
if [ -f "$SCAN_SCRIPT" ]; then
  bash "$SCAN_SCRIPT" "$LOCAL_FILE"
  SCAN_RESULT=$?
  if [ $SCAN_RESULT -ne 0 ]; then
    echo ""
    echo "❌ 安全扫描未通过，部署已中止！"
    echo "   请先修复安全问题，再重新部署。"
    exit 1
  fi
else
  echo "⚠️  安全扫描脚本不存在，跳过扫描"
fi

# Step 2: 部署
echo ""
echo "📦 Step 2: 部署到 $SERVER"
scp -i "$SSH_KEY" "$LOCAL_FILE" "root@${SERVER}:${REMOTE_PATH}"
if [ $? -eq 0 ]; then
  echo "✅ 文件传输成功"
else
  echo "❌ 文件传输失败"
  exit 3
fi

# Step 3: 验证远程文件
echo ""
echo "🔍 Step 3: 远程验证"
REMOTE_CHECK=$(ssh -i "$SSH_KEY" "root@${SERVER}" "grep -c '192\.168\.' ${REMOTE_PATH}" 2>/dev/null || echo "0")
if [ "$REMOTE_CHECK" -gt 0 ]; then
  echo "❌ 远程文件仍包含内网 IP，部署可能有问题！"
  exit 1
else
  echo "✅ 远程文件安全检查通过"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 部署完成: https://${SERVER}/netdraw.html"
