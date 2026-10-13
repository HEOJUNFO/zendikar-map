#requires -Version 7.0
function Get-StudioMcpRegistration {
    param([string]$CodexCli)
    if (-not $CodexCli) {
        $CodexCli = Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin') -Filter codex.exe -Recurse |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $CodexCli) { throw 'Codex CLI was not found. Pass -CodexCli explicitly.' }
    $configuration = (& $CodexCli mcp get tripo-studio --json 2>$null) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw 'The tripo-studio MCP is not registered.' }
    $registration = $configuration | ConvertFrom-Json
    if (-not $registration.enabled -or $registration.transport.type -ne 'stdio' -or
        $registration.transport.env.TRIPO_AUTH_MODE -ne 'provided_session') {
        throw 'The registered MCP must enable provided_session mode; browser login is not used.'
    }
    $manifest = [IO.File]::ReadAllText((Join-Path $registration.transport.cwd '.codex-plugin\plugin.json')) | ConvertFrom-Json
    return [pscustomobject]@{ Version=$manifest.version; Directory=$registration.transport.cwd }
}

class StudioMcpConnection : System.IDisposable {
    hidden [Net.Http.HttpClientHandler] $Handler
    hidden [Net.Http.HttpClient] $Client
    hidden [string] $SessionId
    hidden [string] $Protocol = '2025-11-25'
    hidden [string] $Endpoint = 'http://127.0.0.1:32175/mcp'
    hidden [int] $NextId = 1
    [string] $Version
    StudioMcpConnection([string] $version) {
        $this.Version = $version
        $this.Handler = [Net.Http.HttpClientHandler]::new()
        $this.Handler.AllowAutoRedirect = $false
        $this.Handler.UseProxy = $false
        $this.Client = [Net.Http.HttpClient]::new($this.Handler)
        $this.Client.Timeout = [TimeSpan]::FromSeconds(120)
        try {
            $initialized = $this.Rpc(@{jsonrpc='2.0';id=$this.NextId++;method='initialize';params=@{
                protocolVersion=$this.Protocol;capabilities=@{};clientInfo=@{name='zendikar-studio-client';version='1.0'}
            }})
            $this.Protocol = $initialized.protocolVersion
            $this.Rpc(@{jsonrpc='2.0';method='notifications/initialized'}) | Out-Null
        } catch {
            $this.Client.Dispose(); $this.Handler.Dispose()
            throw 'The local Studio MCP is not running. Start its registered tools in Codex first.'
        }
    }
    hidden [object] Rpc([hashtable] $message) {
        $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, $this.Endpoint)
        $request.Headers.TryAddWithoutValidation('Accept','application/json, text/event-stream') | Out-Null
        $request.Headers.TryAddWithoutValidation('x-tripo-studio-mcp-version',$this.Version) | Out-Null
        $request.Headers.TryAddWithoutValidation('MCP-Protocol-Version',$this.Protocol) | Out-Null
        if ($this.SessionId) { $request.Headers.TryAddWithoutValidation('Mcp-Session-Id',$this.SessionId) | Out-Null }
        $request.Content = [Net.Http.StringContent]::new(($message | ConvertTo-Json -Depth 80 -Compress),[Text.Encoding]::UTF8,'application/json')
        $response = $null
        try {
            $response = $this.Client.SendAsync($request).GetAwaiter().GetResult()
            if (-not $response.IsSuccessStatusCode) { throw "Local MCP HTTP $([int]$response.StatusCode)." }
            if ($response.Headers.Contains('Mcp-Session-Id')) { $this.SessionId = @($response.Headers.GetValues('Mcp-Session-Id'))[0] }
            $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            if ([string]::IsNullOrWhiteSpace($body)) { return $null }
            try { $decoded = $body | ConvertFrom-Json } catch { throw 'The local MCP returned invalid JSON.' }
            if ($decoded.error) { throw 'Local MCP protocol error.' }
            return $decoded.result
        } finally {
            $body = $null; $message = $null
            if ($response) { $response.Dispose() }
            $request.Dispose()
        }
    }
    [object] ListTools() { return $this.Rpc(@{jsonrpc='2.0';id=$this.NextId++;method='tools/list';params=@{}}) }
    [object] CallTool([string] $name, [hashtable] $arguments) {
        $result = $this.Rpc(@{jsonrpc='2.0';id=$this.NextId++;method='tools/call';params=@{name=$name;arguments=$arguments}})
        $data = $result.structuredContent
        if ($null -eq $data) {
            $textBlock = @($result.content | Where-Object type -EQ 'text')[0]
            if ($textBlock) {
                try { $data = $textBlock.text | ConvertFrom-Json } catch { throw 'The Studio tool returned invalid JSON.' }
            }
        }
        if ($result.isError) {
            $code = if ($data.error.code -match '^[A-Z0-9_]{1,60}$') { $data.error.code } else { 'REQUEST_FAILED' }
            throw "Studio MCP rejected the request: $code"
        }
        return $data
    }
    [void] Dispose() {
        if ($this.SessionId) {
            $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Delete,$this.Endpoint)
            $request.Headers.TryAddWithoutValidation('x-tripo-studio-mcp-version',$this.Version) | Out-Null
            $request.Headers.TryAddWithoutValidation('Mcp-Session-Id',$this.SessionId) | Out-Null
            $request.Headers.TryAddWithoutValidation('MCP-Protocol-Version',$this.Protocol) | Out-Null
            try { $response=$this.Client.SendAsync($request).GetAwaiter().GetResult(); $response.Dispose() } catch {}
            $request.Dispose()
        }
        $this.SessionId=$null; $this.Client.Dispose(); $this.Handler.Dispose()
    }
}

function Open-StudioMcpConnection {
    param([string]$CodexCli)
    $registration = Get-StudioMcpRegistration -CodexCli $CodexCli
    return [StudioMcpConnection]::new($registration.Version)
}
Export-ModuleMember -Function Get-StudioMcpRegistration,Open-StudioMcpConnection
