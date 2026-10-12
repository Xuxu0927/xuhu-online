$keyFile = Join-Path $env:USERPROFILE '.ssh\xhblogs_aliyun_8_133_165_170'
$trustFile = Join-Path $env:USERPROFILE '.ssh\known_hosts_xhblogs_aliyun'
Write-Host '打开 http://localhost:18081/admin，保持此终端运行。'
ssh -i $keyFile -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$trustFile" -o ExitOnForwardFailure=yes -N -L 127.0.0.1:18081:127.0.0.1:18081 admin@8.133.165.170
