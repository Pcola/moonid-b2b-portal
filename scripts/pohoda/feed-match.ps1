# Zistí, či sa humed feed (g:sku / g:gtin / g:id) dá namapovať na Pohoda SKz (IDS / EAN / Kod)
$ErrorActionPreference = 'Stop'
$feedPath = 'C:\Users\lukas\Downloads\feed.xml'
$mdb      = 'C:\Users\lukas\Downloads\mdb\50934660_2026.mdb'

function Norm([string]$s){ if([string]::IsNullOrWhiteSpace($s)){return ''}; return $s.Trim().TrimStart('0') }

# ---------- FEED ----------
$raw = Get-Content $feedPath -Raw
$items = [regex]::Matches($raw, '(?s)<item>(.*?)</item>')
$feedSku  = New-Object System.Collections.Generic.HashSet[string]
$feedId   = New-Object System.Collections.Generic.HashSet[string]
$feedGtin = New-Object System.Collections.Generic.HashSet[string]
$feedSkuNorm = New-Object System.Collections.Generic.HashSet[string]
$skuCount = 0; $gtinCount = 0
foreach($m in $items){
  $b = $m.Groups[1].Value
  $id  = ([regex]::Match($b,'<g:id>(.*?)</g:id>')).Groups[1].Value.Trim()
  $sku = ([regex]::Match($b,'<g:sku>(.*?)</g:sku>')).Groups[1].Value.Trim()
  $gt  = ([regex]::Match($b,'<g:gtin>(.*?)</g:gtin>')).Groups[1].Value.Trim()
  if($id) { [void]$feedId.Add($id) }
  if($sku){ [void]$feedSku.Add($sku); [void]$feedSkuNorm.Add((Norm $sku)); $skuCount++ }
  if($gt) { [void]$feedGtin.Add($gt); $gtinCount++ }
}
Write-Output ("FEED: items={0}  sku_nonempty={1}  sku_distinct={2}  gtin_nonempty={3}  id_distinct={4}" -f $items.Count,$skuCount,$feedSku.Count,$gtinCount,$feedId.Count)

# ---------- SKz ----------
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$mdb;")
$conn.Open()

# dump columns of SKz
$cmd0 = $conn.CreateCommand(); $cmd0.CommandText = "SELECT TOP 1 * FROM SKz"
$r0 = $cmd0.ExecuteReader()
$cols = @(); for($i=0;$i -lt $r0.FieldCount;$i++){ $cols += $r0.GetName($i) }
$r0.Close()
$wanted = @('IDS','EAN','Kod','Nazev','SText','Stav') | Where-Object { $cols -contains $_ }
Write-Output ("SKz columns ({0}) sample: {1}" -f $cols.Count, (($cols | Select-Object -First 40) -join ', '))
Write-Output ("Using SKz columns: " + ($wanted -join ', '))

$hasIDS = $cols -contains 'IDS'; $hasEAN = $cols -contains 'EAN'; $hasKod = $cols -contains 'Kod'
$cmd = $conn.CreateCommand(); $cmd.CommandText = "SELECT * FROM SKz"
$rdr = $cmd.ExecuteReader()
$skzIDS = New-Object System.Collections.Generic.HashSet[string]
$skzEAN = New-Object System.Collections.Generic.HashSet[string]
$skzKod = New-Object System.Collections.Generic.HashSet[string]
$skzIDSnorm = New-Object System.Collections.Generic.HashSet[string]
$rows=0; $idsN=0; $eanN=0; $kodN=0
while($rdr.Read()){
  $rows++
  if($hasIDS){ $v=$rdr['IDS']; if($v -ne [DBNull]::Value){ $s=([string]$v).Trim(); if($s){[void]$skzIDS.Add($s);[void]$skzIDSnorm.Add((Norm $s));$idsN++} } }
  if($hasEAN){ $v=$rdr['EAN']; if($v -ne [DBNull]::Value){ $s=([string]$v).Trim(); if($s){[void]$skzEAN.Add($s);$eanN++} } }
  if($hasKod){ $v=$rdr['Kod']; if($v -ne [DBNull]::Value){ $s=([string]$v).Trim(); if($s){[void]$skzKod.Add($s);$kodN++} } }
}
$rdr.Close(); $conn.Close()
Write-Output ("SKz: rows={0}  IDS_nonempty={1} IDS_distinct={2}  EAN_nonempty={3} EAN_distinct={4}  Kod_nonempty={5} Kod_distinct={6}" -f $rows,$idsN,$skzIDS.Count,$eanN,$skzEAN.Count,$kodN,$skzKod.Count)

# ---------- OVERLAPS ----------
function Inter($a,$b){ $c=0; foreach($x in $a){ if($b.Contains($x)){$c++} }; $c }
Write-Output "----- ZHODY (koľko feed kódov sa nájde v Pohode) -----"
Write-Output ("feed.sku  in SKz.IDS  = {0} / {1}" -f (Inter $feedSku $skzIDS), $feedSku.Count)
Write-Output ("feed.sku  in SKz.EAN  = {0} / {1}" -f (Inter $feedSku $skzEAN), $feedSku.Count)
Write-Output ("feed.sku  in SKz.Kod  = {0} / {1}" -f (Inter $feedSku $skzKod), $feedSku.Count)
Write-Output ("feed.sku(norm) in IDS(norm) = {0} / {1}" -f (Inter $feedSkuNorm $skzIDSnorm), $feedSkuNorm.Count)
Write-Output ("feed.gtin in SKz.EAN  = {0} / {1}" -f (Inter $feedGtin $skzEAN), $feedGtin.Count)
Write-Output ("feed.gtin in SKz.IDS  = {0} / {1}" -f (Inter $feedGtin $skzIDS), $feedGtin.Count)
Write-Output ("feed.id   in SKz.IDS  = {0} / {1}" -f (Inter $feedId  $skzIDS), $feedId.Count)
Write-Output "----- VZORKY -----"
Write-Output ("feed.sku:  " + (($feedSku  | Select-Object -First 10) -join ', '))
Write-Output ("SKz.IDS:   " + (($skzIDS   | Select-Object -First 10) -join ', '))
Write-Output ("SKz.EAN:   " + (($skzEAN   | Select-Object -First 10) -join ', '))
Write-Output ("SKz.Kod:   " + (($skzKod   | Select-Object -First 10) -join ', '))
