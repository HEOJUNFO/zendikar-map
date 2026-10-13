#requires -Version 7.0
param([switch]$CheckOnly,[string]$CodexCli)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'StudioMcp.psm1') -Force
$connection=$null; $token=$null; $arguments=$null
try {
    $connection=Open-StudioMcpConnection -CodexCli $CodexCli
    $tools=$connection.ListTools()
    if (-not ($tools.tools | Where-Object name -EQ 'tripo_set_session')) { throw 'This MCP does not expose the local direct-session tool.' }
    if ($CheckOnly) { [pscustomobject]@{ready=$true;version=$connection.Version;authMode='provided_session'} | ConvertTo-Json -Compress; exit 0 }
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [Windows.Forms.Application]::EnableVisualStyles()
    $form=[Windows.Forms.Form]::new()
    $form.Text='Tripo Studio API - 로컬 세션 연결'
    $form.ClientSize=[Drawing.Size]::new(520,250)
    $form.StartPosition='CenterScreen'; $form.FormBorderStyle='FixedDialog'
    $form.MaximizeBox=$false; $form.MinimizeBox=$false
    $form.Font=[Drawing.Font]::new('Malgun Gothic',10)
    $heading=[Windows.Forms.Label]::new()
    $heading.Text='본인 Studio의 Authorization JWT를 입력하세요.'
    $heading.SetBounds(22,18,475,26); $form.Controls.Add($heading)
    $label=[Windows.Forms.Label]::new()
    $label.Text='Studio 토큰'; $label.SetBounds(22,60,92,25); $form.Controls.Add($label)
    $tokenBox=[Windows.Forms.TextBox]::new()
    $tokenBox.UseSystemPasswordChar=$true; $tokenBox.MaxLength=16384
    $tokenBox.SetBounds(118,58,374,29); $tokenBox.TabIndex=0; $form.Controls.Add($tokenBox)
    $notice=[Windows.Forms.Label]::new()
    $notice.Text="Bearer 접두사를 포함해도 됩니다. 토큰은 현재 실행 메모리에만 보관합니다.`r`n채팅·파일·명령줄에 쓰지 않고 브라우저를 열지 않습니다."
    $notice.SetBounds(22,106,475,54); $form.Controls.Add($notice)
    $validation=[Windows.Forms.Label]::new()
    $validation.ForeColor=[Drawing.Color]::DarkRed; $validation.SetBounds(22,166,475,24); $form.Controls.Add($validation)
    $connect=[Windows.Forms.Button]::new()
    $connect.Text='API 연결'; $connect.SetBounds(278,205,104,34); $connect.TabIndex=1
    $connect.Add_Click({
        if ([string]::IsNullOrWhiteSpace($tokenBox.Text)) { $validation.Text='Studio 토큰을 입력하세요.'; return }
        $form.DialogResult=[Windows.Forms.DialogResult]::OK; $form.Close()
    })
    $form.Controls.Add($connect)
    $cancel=[Windows.Forms.Button]::new()
    $cancel.Text='취소'; $cancel.SetBounds(392,205,100,34); $cancel.TabIndex=2
    $cancel.DialogResult=[Windows.Forms.DialogResult]::Cancel; $form.Controls.Add($cancel)
    $form.AcceptButton=$connect; $form.CancelButton=$cancel
    $form.Add_Shown({$tokenBox.Focus() | Out-Null})
    if ($form.ShowDialog() -ne [Windows.Forms.DialogResult]::OK) { $tokenBox.Clear(); $form.Dispose(); exit 2 }
    $token=$tokenBox.Text.Trim(); $tokenBox.Clear(); $form.Dispose()
    $arguments=@{access_token=$token;replace_current=$true}
    $result=$connection.CallTool('tripo_set_session',$arguments)
    if (-not $result.session.authenticated -or $result.session.source -ne 'provided' -or $result.persistence -ne 'memory') {
        throw 'The MCP did not confirm a memory-only direct Studio session.'
    }
    [pscustomobject]@{status='connected';source='provided';persistence='memory';expiresAt=$result.session.expires_at} | ConvertTo-Json -Compress
} catch { Write-Error $_.Exception.Message; exit 1 }
finally {
    if ($arguments) { $arguments.access_token=$null }
    $arguments=$null; $token=$null
    if ($connection) { $connection.Dispose() }
}
