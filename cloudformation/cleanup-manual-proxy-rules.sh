#!/usr/bin/env bash
#
# cleanup-manual-proxy-rules.sh
# ----------------------------------------------------------------------------
# Removes the HAND-ADDED proxy-access rules from the Cell-KN sandbox ALB
# security group and subnet Network ACL, then (optionally) deploys the
# CloudFormation stack that re-creates them from a single source of truth
# (environment/proxy-access.yaml).
#
# WHY: the SG and NACL rules drifted because they were edited by hand. Before
# proxy-access.yaml can manage them, the existing manual entries must be cleared
# or CloudFormation fails with "rule already exists" (SG) / duplicate rule
# number (NACL). See SANDBOX-FINDINGS.md, Findings 1 & 3.
#
# !!! THIS BRIEFLY REMOVES ALL PROXY ACCESS TO THE SITE !!!
# Run it ONLY in a coordinated maintenance window, and run the stack deploy
# (step 3) immediately afterward so access is restored.
#
# REQUIRED PERMISSIONS (the sandbox app role does NOT have these — a platform
# admin must run this):
#   ec2:RevokeSecurityGroupIngress
#   ec2:DeleteNetworkAclEntry
#   cloudformation:CreateStack / UpdateStack   (for the optional deploy step)
#
# USAGE:
#   ./cleanup-manual-proxy-rules.sh              # DRY RUN (default): prints actions, changes nothing
#   ./cleanup-manual-proxy-rules.sh --apply      # actually revoke/delete the manual rules
#   ./cleanup-manual-proxy-rules.sh --apply --deploy   # also create/deploy the CFN stack afterward
#
# Always run the default dry-run first and eyeball the output.
# ----------------------------------------------------------------------------
set -euo pipefail

# ---- Configuration (verify these match the live environment before running) ----
REGION="us-east-1"
SG_ID="sg-06415d49b7c8a689c"
NACL_ID="acl-08914a851e84ea93b"
STACK_NAME="cell-kn-sandbox-proxy-access"
TEMPLATE_FILE="$(dirname "$0")/environment/proxy-access.yaml"

# Manual SG ingress rules to revoke: every proxy CIDR on tcp/80 and tcp/443.
# (The icmpv6 rule and any non-proxy rules are intentionally left untouched.)
PROXY_CIDRS=(
  "130.14.160.0/24"
  "130.14.233.0/25"
  "130.14.237.0/25"
  "130.14.15.186/32"
  "130.14.25.182/32"
)
SG_PORTS=(80 443)

# Manual NACL INBOUND (Egress=false) rule numbers to delete. These are the
# proxy-range entries observed during diagnosis. VPC-internal (10.0.64.0/18),
# ephemeral (1000+), and ICMP rules are deliberately NOT in this list.
#   102 130.14.160.0/24:80   105 130.14.160.0/24:443
#   104 130.14.233.0/25:80   107 130.14.233.0/25:443
#   108 130.14.237.0/25:80   109 130.14.237.0/25:443
#   111 130.14.15.186/32:80  110 130.14.15.186/32:443
NACL_INBOUND_RULES=(102 104 105 107 108 109 110 111)
# ---------------------------------------------------------------------------

APPLY=false
DEPLOY=false
for arg in "$@"; do
  case "$arg" in
    --apply)  APPLY=true ;;
    --deploy) DEPLOY=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

run() {
  # Print the command; only execute it when --apply is set.
  echo "  > $*"
  if [[ "$APPLY" == "true" ]]; then
    "$@"
  fi
}

echo "=============================================================="
if [[ "$APPLY" == "true" ]]; then
  echo " MODE: APPLY  — changes WILL be made. Access drops until deploy."
else
  echo " MODE: DRY RUN — no changes will be made (pass --apply to execute)."
fi
echo " Region: $REGION   SG: $SG_ID   NACL: $NACL_ID"
echo "=============================================================="

# ---- 0. Preview current state (always, read-only) -------------------------
echo
echo "## Current SG inbound rules (proxy ports):"
aws ec2 describe-security-groups --region "$REGION" --group-ids "$SG_ID" \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`80`||FromPort==`443`].{Port:FromPort,CIDRs:IpRanges[].CidrIp}' \
  --output table || true

echo
echo "## Current NACL inbound entries to be deleted (rule numbers ${NACL_INBOUND_RULES[*]}):"
aws ec2 describe-network-acls --region "$REGION" --network-acl-ids "$NACL_ID" \
  --query "NetworkAcls[0].Entries[?Egress==\`false\`].{Rule:RuleNumber,Cidr:CidrBlock,Ports:PortRange}" \
  --output table || true

if [[ "$APPLY" == "true" ]]; then
  echo
  read -r -p "Type 'CONFIRM' to revoke/delete these manual rules: " ans
  [[ "$ans" == "CONFIRM" ]] || { echo "Aborted."; exit 1; }
fi

# ---- 1. Revoke manual SECURITY GROUP ingress rules ------------------------
echo
echo "## Step 1: revoke manual security-group ingress rules"
for cidr in "${PROXY_CIDRS[@]}"; do
  for port in "${SG_PORTS[@]}"; do
    run aws ec2 revoke-security-group-ingress --region "$REGION" \
      --group-id "$SG_ID" --protocol tcp --port "$port" --cidr "$cidr"
  done
done

# ---- 2. Delete manual NETWORK ACL inbound entries -------------------------
echo
echo "## Step 2: delete manual Network ACL inbound entries"
for rn in "${NACL_INBOUND_RULES[@]}"; do
  run aws ec2 delete-network-acl-entry --region "$REGION" \
    --network-acl-id "$NACL_ID" --rule-number "$rn" --ingress
done

# ---- 3. (Optional) deploy the CloudFormation stack ------------------------
echo
if [[ "$DEPLOY" == "true" ]]; then
  echo "## Step 3: deploy $STACK_NAME from $TEMPLATE_FILE"
  run aws cloudformation deploy --region "$REGION" \
    --stack-name "$STACK_NAME" \
    --template-file "$TEMPLATE_FILE" \
    --capabilities CAPABILITY_AUTO_EXPAND \
    --no-fail-on-empty-changeset
else
  echo "## Step 3 (skipped): deploy the stack to restore access:"
  echo "     aws cloudformation deploy --region $REGION \\"
  echo "       --stack-name $STACK_NAME \\"
  echo "       --template-file $TEMPLATE_FILE \\"
  echo "       --capabilities CAPABILITY_AUTO_EXPAND"
fi

# ---- 4. Verify ------------------------------------------------------------
echo
echo "## After deploy, confirm traffic is arriving (RequestCount should rise):"
echo "   aws cloudwatch get-metric-statistics --region $REGION \\"
echo "     --namespace AWS/ApplicationELB --metric-name RequestCount \\"
echo "     --dimensions Name=LoadBalancer,Value=<alb-full-name> \\"
echo "     --start-time \$(date -u -v-15M '+%Y-%m-%dT%H:%M:%S') \\"
echo "     --end-time \$(date -u '+%Y-%m-%dT%H:%M:%S') \\"
echo "     --period 60 --statistics Sum"
echo
echo "Done (${APPLY/false/dry-run}${APPLY/true/applied})."
