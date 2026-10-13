#requires -Version 7.0
param([string]$Output=(Join-Path $PSScriptRoot 'contracts.json'),[string]$CodexCli)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'StudioMcp.psm1') -Force
function Remove-Prose($Value) {
    if ($Value -is [Collections.IDictionary]) {
        $clean=[ordered]@{}
        # Preserve properties named title/description; only schema annotation strings are omitted.
        foreach ($key in $Value.Keys) {
            if ($key -notin @('description','title') -or $Value[$key] -isnot [string]) { $clean[$key]=Remove-Prose $Value[$key] }
        }
        return $clean
    }
    if ($Value -is [Collections.IList]) { return ,@($Value | ForEach-Object { Remove-Prose $_ }) }
    return $Value
}
$connection=$null
try {
    $connection=Open-StudioMcpConnection -CodexCli $CodexCli
    $catalog=$connection.ListTools() | ConvertTo-Json -Depth 80 | ConvertFrom-Json -AsHashtable
    $capabilities=$connection.CallTool('tripo_get_workflow_capabilities',@{}) | ConvertTo-Json -Depth 80 | ConvertFrom-Json -AsHashtable
    $snapshot=[ordered]@{
        schemaVersion=1
        capturedAt=[DateTimeOffset]::Now.ToString('o')
        version=$connection.Version
        authMode='provided_session'
        upstream='https://github.com/Ador-able/tripo-studio-mcp'
        upstreamCommit='45df024ff8196ddd3f9226a082b87ce5b4c459c2'
        tools=@($catalog.tools | ForEach-Object { Remove-Prose @{name=$_.name;inputSchema=$_.inputSchema;outputSchema=$_.outputSchema} })
        operations=@($capabilities.operations | ForEach-Object { Remove-Prose $_ })
    }
    $path=[IO.Path]::GetFullPath($Output)
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path)) | Out-Null
    [IO.File]::WriteAllText($path,($snapshot | ConvertTo-Json -Depth 80),[Text.UTF8Encoding]::new($false))
    [pscustomobject]@{version=$snapshot.version;tools=$snapshot.tools.Count;operations=$snapshot.operations.Count;output=$path} | ConvertTo-Json -Compress
} finally { if ($connection) { $connection.Dispose() } }
