# Local private pipe input. Stdout is captured only by direct-studio.mjs.
# Never invoke this script as a standalone terminal command.
#requires -Version 7.0
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()
$form=[Windows.Forms.Form]::new()
$form.Text='Tripo Studio 웹 JWT — 직접 API'
$form.ClientSize=[Drawing.Size]::new(540,220)
$form.StartPosition='CenterScreen'; $form.FormBorderStyle='FixedDialog'
$form.ShowInTaskbar=$true;$form.TopMost=$true
$form.MaximizeBox=$false; $form.MinimizeBox=$false
$form.Font=[Drawing.Font]::new('Malgun Gothic',10)
$label=[Windows.Forms.Label]::new()
$label.Text="본인 Studio의 JWT를 입력하세요. MCP 서버는 사용하지 않습니다.`r`n토큰은 생성 프로세스의 메모리에만 보관됩니다."
$label.SetBounds(20,16,500,52);$form.Controls.Add($label)
$box=[Windows.Forms.TextBox]::new();$box.UseSystemPasswordChar=$true
$box.MaxLength=16384;$box.SetBounds(20,82,500,30);$form.Controls.Add($box)
$notice=[Windows.Forms.Label]::new()
$notice.Text='채팅·파일·명령줄·환경 변수·로그에 토큰을 남기지 않습니다.'
$notice.SetBounds(20,124,500,28);$form.Controls.Add($notice)
$ok=[Windows.Forms.Button]::new();$ok.Text='직접 API 연결'
$ok.SetBounds(274,170,130,32);$ok.DialogResult=[Windows.Forms.DialogResult]::OK;$form.Controls.Add($ok)
$cancel=[Windows.Forms.Button]::new();$cancel.Text='취소';$cancel.SetBounds(414,170,106,32)
$cancel.DialogResult=[Windows.Forms.DialogResult]::Cancel;$form.Controls.Add($cancel)
$form.AcceptButton=$ok;$form.CancelButton=$cancel
$form.Add_Shown({$form.Activate();$box.Focus()|Out-Null;[Console]::Error.WriteLine('LOCAL-JWT-WINDOW-READY')})
try {
 if($form.ShowDialog() -ne [Windows.Forms.DialogResult]::OK){exit 2}
 $token=$box.Text.Trim();$box.Clear()
 if([string]::IsNullOrWhiteSpace($token)){exit 2}
 [Console]::Out.Write($token)
}finally{$token=$null;$box.Clear();$form.Dispose()}
