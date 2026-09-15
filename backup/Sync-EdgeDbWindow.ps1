<#
.SYNOPSIS
  Copies the last N days of data for every TimescaleDB hypertable in edge_db
  from a source Postgres server (.218) to a target server, without touching
  or deleting anything on the source.

.DESCRIPTION
  Asks the SOURCE database's own catalog (timescaledb_information.hypertables /
  .dimensions) which tables are hypertables and what their time column is,
  then streams a time-filtered COPY straight from source -> target for each
  one via psql's \copy ... TO STDOUT / FROM STDIN.

.REQUIREMENTS
  - psql.exe on PATH (installed with the PostgreSQL client tools /
    "Command Line Tools" component - typically
    C:\Program Files\PostgreSQL\<version>\bin)
  - Network access from wherever you run this to BOTH servers, on the
    Postgres port.
  - Run this from a jump box or the NEW server - avoid running it on .218
    itself given it's already unstable.

.EXAMPLE
  $env:PGPASSWORD_SRC = 'sourcepass'
  $env:PGPASSWORD_TGT = 'targetpass'
  .\Sync-EdgeDbWindow.ps1 -SrcHost 10.0.0.218 -SrcUser youruser `
                           -TgtHost newserver -TgtUser youruser `
                           -Window '2 days'
#>

param(
    [Parameter(Mandatory=$true)][string]$SrcHost,
    [int]$SrcPort = 5433,
    [string]$SrcDb = "edge_db",
    [Parameter(Mandatory=$true)][string]$SrcUser,

    [Parameter(Mandatory=$true)][string]$TgtHost,
    [int]$TgtPort = 5433,
    [string]$TgtDb = "edge_db",
    [Parameter(Mandatory=$true)][string]$TgtUser,

    [string]$Window = "2 days"
)

$ErrorActionPreference = "Stop"

# Raise the statement timeout for the whole session via PGOPTIONS rather than
# an in-band SET command - an in-band SET would print "SET" into stdout and
# corrupt the CSV stream during \copy TO STDOUT.
$env:PGOPTIONS = "-c statement_timeout=0"

# Passwords: prefer a %APPDATA%\postgresql\pgpass.conf file instead of env
# vars where possible. If using env vars, set these BEFORE running:
#   $env:PGPASSWORD_SRC = '...'
#   $env:PGPASSWORD_TGT = '...'
$SrcPassword = $env:PGPASSWORD_SRC
$TgtPassword = $env:PGPASSWORD_TGT

$LogFile = "edge_db_sync_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date)

function Write-Log {
    param([string]$Message)
    $Message | Tee-Object -FilePath $LogFile -Append
}

function Invoke-PsqlSrc {
    param([string]$Sql)
    $env:PGPASSWORD = $SrcPassword
    psql -h $SrcHost -p $SrcPort -U $SrcUser -d $SrcDb -X -q -A -t -c $Sql
}

function Invoke-PsqlTgt {
    param([string]$Sql)
    $env:PGPASSWORD = $TgtPassword
    psql -h $TgtHost -p $TgtPort -U $TgtUser -d $TgtDb -X -q -A -t -c $Sql
}

function Get-OrderedColumns {
    param([string]$InvokeFn, [string]$Schema, [string]$Table)
    $sql = "SELECT column_name FROM information_schema.columns WHERE table_schema = '$Schema' AND table_name = '$Table' ORDER BY ordinal_position;"
    $rows = & $InvokeFn -Sql $sql
    @($rows | Where-Object { $_ -and $_.Trim() -ne "" } | ForEach-Object { $_.Trim() })
}

Write-Log "=== edge_db window sync: last $Window ==="
Write-Log "Source: ${SrcHost}:${SrcPort}/${SrcDb}"
Write-Log "Target: ${TgtHost}:${TgtPort}/${TgtDb}"
Write-Log ""
Write-Log "Discovering hypertables + time columns on source..."

$discoverSql = @"
SELECT h.hypertable_schema || '|' || h.hypertable_name || '|' || d.column_name
FROM timescaledb_information.hypertables h
JOIN timescaledb_information.dimensions d
  ON d.hypertable_schema = h.hypertable_schema
 AND d.hypertable_name   = h.hypertable_name
 AND d.dimension_type    = 'Time'
ORDER BY h.hypertable_schema, h.hypertable_name;
"@

$hypertableRows = Invoke-PsqlSrc -Sql $discoverSql | Where-Object { $_.Trim() -ne "" }

Write-Log "Found $($hypertableRows.Count) hypertables to check."
Write-Log ""

$failed = @()

foreach ($row in $hypertableRows) {
    $parts = $row -split '\|'
    $schema  = $parts[0]
    $table   = $parts[1]
    $timecol = $parts[2]

    $full  = "`"$schema`".`"$table`""
    $label = "$schema.$table"

    $countSql = "SELECT count(*) FROM $full WHERE `"$timecol`" >= now() - interval '$Window';"
    $srcCountRaw = Invoke-PsqlSrc -Sql $countSql
    $srcCount = if ($srcCountRaw) { [int]$srcCountRaw } else { 0 }

    if ($srcCount -eq 0) {
        Write-Log "[$label] no rows in window, skipping"
        continue
    }

    Write-Log "[$label] $srcCount row(s) in window -> copying..."

    # Compare live columns on both sides - the target may have been
    # provisioned from a newer migration set than the source. Only copy
    # columns that exist on BOTH; anything target-only falls back to its
    # column default (or NULL) instead of breaking the whole copy.
    $srcCols = Get-OrderedColumns -InvokeFn "Invoke-PsqlSrc" -Schema $schema -Table $table
    $tgtCols = Get-OrderedColumns -InvokeFn "Invoke-PsqlTgt" -Schema $schema -Table $table
    $commonCols = @($srcCols | Where-Object { $tgtCols -contains $_ })
    $tgtOnlyCols = @($tgtCols | Where-Object { $srcCols -notcontains $_ })

    if ($commonCols.Count -eq 0) {
        Write-Log "  !! FAILED for $label - no matching columns found between source and target"
        $failed += $label
        continue
    }
    if ($tgtOnlyCols.Count -gt 0) {
        Write-Log "  note: target-only column(s) will use default/NULL: $($tgtOnlyCols -join ', ')"
    }

    $quotedCols = ($commonCols | ForEach-Object { "`"$_`"" }) -join ', '

    $copyOutSql = "\copy (SELECT $quotedCols FROM $full WHERE `"$timecol`" >= now() - interval '$Window') TO STDOUT WITH CSV"
    $copyInSql  = "\copy $full ($quotedCols) FROM STDIN WITH CSV"

    $tmpOut = [System.IO.Path]::GetTempFileName()
    $tmpErr1 = "$tmpOut.err1"
    $tmpErr2 = "$tmpOut.err2"

    try {
        $env:PGPASSWORD = $SrcPassword
        & psql -h $SrcHost -p $SrcPort -U $SrcUser -d $SrcDb -c $copyOutSql 1> $tmpOut 2> $tmpErr1
        if ($LASTEXITCODE -ne 0) {
            $errText = (Get-Content $tmpErr1 -Raw -ErrorAction SilentlyContinue)
            throw "source copy-out failed: $errText"
        }

        $env:PGPASSWORD = $TgtPassword
        Get-Content $tmpOut -Raw | & psql -h $TgtHost -p $TgtPort -U $TgtUser -d $TgtDb -c $copyInSql 2> $tmpErr2
        if ($LASTEXITCODE -ne 0) {
            $errText = (Get-Content $tmpErr2 -Raw -ErrorAction SilentlyContinue)
            throw "target copy-in failed: $errText"
        }

        $tgtCountRaw = Invoke-PsqlTgt -Sql $countSql
        $tgtCount = if ($tgtCountRaw) { [int]$tgtCountRaw } else { 0 }
        Write-Log "  OK - target now has $tgtCount row(s) in window"

        # Bump the id sequence if this table has a serial/identity "id" column
        $seqSql = "SELECT pg_get_serial_sequence('$full', 'id');"
        $seqRaw = Invoke-PsqlTgt -Sql $seqSql
        $seq = if ($seqRaw) { $seqRaw.Trim() } else { "" }
        if ($seq -ne "") {
            Invoke-PsqlTgt -Sql "SELECT setval('$seq', COALESCE((SELECT max(id) FROM $full), 1));" | Out-Null
            Write-Log "  sequence $seq bumped to match max(id)"
        }
    }
    catch {
        Write-Log "  !! FAILED for $label - $($_.Exception.Message) (source untouched - safe to investigate and rerun)"
        $failed += $label
    }
    finally {
        Remove-Item $tmpOut, $tmpErr1, $tmpErr2 -ErrorAction SilentlyContinue
    }
}

Write-Log ""
if ($failed.Count -eq 0) {
    Write-Log "=== Done. All hypertables copied successfully. ==="
} else {
    Write-Log "=== Done with failures in: $($failed -join ', ') ==="
    Write-Log "Tables NOT in this list should not be rerun blindly - rerunning a table"
    Write-Log "already copied will hit primary-key conflicts if rows are already present."
}
Write-Log "Full log: $LogFile"