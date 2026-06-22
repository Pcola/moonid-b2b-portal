# Odhad: koľko Pohoda produktov (SKz) sa dá spárovať s humed feedom podľa NÁZVU
$ErrorActionPreference = 'Stop'
$feedPath = 'C:\Users\lukas\Downloads\feed.xml'
$mdb      = 'C:\Users\lukas\Downloads\mdb\50934660_2026.mdb'

function StripDia([string]$s){
  if([string]::IsNullOrWhiteSpace($s)){return ''}
  $n = $s.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach($ch in $n.ToCharArray()){
    if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark){ [void]$sb.Append($ch) }
  }
  $sb.ToString()
}
function Toks([string]$s){
  $t = (StripDia $s).ToLower()
  $t = [regex]::Replace($t,'[^a-z0-9]+',' ')
  $set = New-Object System.Collections.Generic.HashSet[string]
  foreach($w in $t.Split(' ',[StringSplitOptions]::RemoveEmptyEntries)){ if($w.Length -ge 2){ [void]$set.Add($w) } }
  $set
}

# ---------- FEED titles ----------
$raw = Get-Content $feedPath -Raw
$items = [regex]::Matches($raw, '(?s)<item>(.*?)</item>')
$feedToks = New-Object System.Collections.Generic.List[object]
$feedTitle = New-Object System.Collections.Generic.List[string]
foreach($m in $items){
  $b = $m.Groups[1].Value
  $title = ([regex]::Match($b,'<g:title>(.*?)</g:title>')).Groups[1].Value.Trim()
  $feedTitle.Add($title)
  $feedToks.Add((Toks $title))
}

# inverted index token -> feed indices
$index = @{}
for($i=0;$i -lt $feedToks.Count;$i++){
  foreach($t in $feedToks[$i]){ if(-not $index.ContainsKey($t)){ $index[$t]=New-Object System.Collections.Generic.List[int] }; $index[$t].Add($i) }
}

# ---------- SKz names ----------
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$mdb;")
$conn.Open()
$cmd = $conn.CreateCommand(); $cmd.CommandText = "SELECT IDS, Nazev FROM SKz"
$rdr = $cmd.ExecuteReader()
$skz = New-Object System.Collections.Generic.List[object]
while($rdr.Read()){
  $ids = if($rdr['IDS'] -ne [DBNull]::Value){[string]$rdr['IDS']}else{''}
  $nz  = if($rdr['Nazev'] -ne [DBNull]::Value){[string]$rdr['Nazev']}else{''}
  $skz.Add([pscustomobject]@{ IDS=$ids.Trim(); Nazev=$nz.Trim(); Toks=(Toks $nz) })
}
$rdr.Close(); $conn.Close()

# ---------- match by name (Jaccard) ----------
$b_strong=0; $b_good=0; $b_weak=0; $b_none=0
$samplesStrong = New-Object System.Collections.Generic.List[string]
$samplesNone   = New-Object System.Collections.Generic.List[string]
foreach($p in $skz){
  if($p.Toks.Count -eq 0){ $b_none++; continue }
  $cand = New-Object System.Collections.Generic.HashSet[int]
  foreach($t in $p.Toks){ if($index.ContainsKey($t)){ foreach($fi in $index[$t]){ [void]$cand.Add($fi) } } }
  $best=0.0; $bestIdx=-1
  foreach($ci in $cand){
    $ft=$feedToks[$ci]
    $inter=0; foreach($x in $p.Toks){ if($ft.Contains($x)){$inter++} }
    $union = $p.Toks.Count + $ft.Count - $inter
    if($union -gt 0){ $j = $inter / $union; if($j -gt $best){ $best=$j; $bestIdx=$ci } }
  }
  if($best -ge 0.6){ $b_strong++; if($samplesStrong.Count -lt 8){ $samplesStrong.Add(("[{0:N2}] '{1}'  ~  '{2}'" -f $best,$p.Nazev,$feedTitle[$bestIdx])) } }
  elseif($best -ge 0.4){ $b_good++ }
  elseif($best -ge 0.2){ $b_weak++ }
  else{ $b_none++; if($samplesNone.Count -lt 8){ $samplesNone.Add($p.Nazev) } }
}
$total=$skz.Count
Write-Output ("SKz produktov: {0}" -f $total)
Write-Output ("Zhoda podla NAZVU (Jaccard tokenov):")
Write-Output ("  silna  (>=0.60): {0}  ({1:P0})" -f $b_strong, ($b_strong/$total))
Write-Output ("  dobra  (0.40-0.60): {0}  ({1:P0})" -f $b_good, ($b_good/$total))
Write-Output ("  slaba  (0.20-0.40): {0}  ({1:P0})" -f $b_weak, ($b_weak/$total))
Write-Output ("  ziadna (<0.20): {0}  ({1:P0})" -f $b_none, ($b_none/$total))
Write-Output ("  --> spolahlivo enrichovatelne (silna+dobra): {0}  ({1:P0})" -f ($b_strong+$b_good), (($b_strong+$b_good)/$total))
Write-Output "----- VZORKY SILNYCH ZHOD -----"
$samplesStrong | ForEach-Object { Write-Output $_ }
Write-Output "----- VZORKY BEZ ZHODY (humed ich nema) -----"
$samplesNone | ForEach-Object { Write-Output ("  " + $_) }
