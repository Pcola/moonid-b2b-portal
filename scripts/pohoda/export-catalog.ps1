# ============================================================
#  Moonid — export katalógu z Pohody (.mdb) do JSON pre import do portálu.
#  Read-only. Spočíta predajné metriky (2017–2026, dedup, RelTpFak=1),
#  aplikuje kuráciu (FEATURED/CATALOG/ARCHIVED), odhadne kategóriu a typ.
#  Spusti: powershell -ExecutionPolicy Bypass -File scripts\pohoda\export-catalog.ps1
# ============================================================
param(
  [string]$MdbDir  = "C:\Users\lukas\Downloads\mdb",
  [string]$OutFile = "C:\workspace\websites\moonid_b2b_portal\data\catalog.json"
)
$ErrorActionPreference = "Stop"
$prov = "Microsoft.ACE.OLEDB.16.0"
function ToD($v){ if($v -is [DBNull]){0.0}else{[double]$v} }
function ToS($v){ if($v -is [DBNull]){''}else{([string]$v).Trim()} }
function Open($f){ $c=New-Object System.Data.OleDb.OleDbConnection "Provider=$prov;Data Source=$f;"; $c.Open(); $c }
function Strip([string]$s){
  $n=$s.Normalize([Text.NormalizationForm]::FormD); $sb=New-Object System.Text.StringBuilder
  foreach($ch in $n.ToCharArray()){ if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark){ [void]$sb.Append($ch) } }
  return $sb.ToString()
}

function MapCat([string]$ln, [string]$kind){
  if($kind -eq "DISPENSER"){ return "davkovace-a-zasobniky" }
  if($kind -eq "EQUIPMENT"){ return "upratovanie" }
  if($ln -match "dezinf|incidin|skinman|sanytol|savo|alkohol|antibak|medicarine|chlor|peroxid"){ return "dezinfekcia" }
  if($ln -match "toaletn|utierk|papier|tissue|jumbo|harmony|vreckovk|serv|obrusk|skladan|celuloz"){ return "hygienicky-papier" }
  if($ln -match "mydlo|mydlov|penov|sampon|sprchov|gel "){ return "mydla-a-peny" }
  if($ln -match "cisti|ajax|cif|fixinela|pulirapid|odmas|wc |krystal|cleamen|pasta|domestos|jar|prac|prasok|odhrdz|odvap"){ return "cistiace-prostriedky" }
  if($ln -match "vrec|sacok|folia|pohar|miska|viecko|tacka|obal|rukavic|alobal|stretch|tanier|pribor"){ return "vrecia-a-obaly" }
  if($ln -match "mop|metla|vedro|stierka|handr|mikrovlakn|kefa|zmetak|hubka|droten|lopatka"){ return "upratovanie" }
  return "prislusenstvo"
}

# 1) predajné metriky naprieč rokmi (dedup dokladov, len predaj)
$rev=@{}; $cust=@{}; $lastY=@{}; $units=@{}; $seen=New-Object 'System.Collections.Generic.HashSet[string]'
foreach($y in 2017..2026){
  $f = Join-Path $MdbDir "50934660_$y.mdb"; if(-not(Test-Path $f)){ continue }
  $c = Open $f
  $cmd=$c.CreateCommand()
  $cmd.CommandText="SELECT f.Cislo AS c,f.Datum AS d,f.KcCelkem AS t,f.RefAD AS ad,p.Kod AS k,p.Mnozstvi AS mn,p.MJKoef AS ko,p.Kc AS kc FROM FApol p INNER JOIN FA f ON p.RefAg=f.ID WHERE f.RelTpFak=1 AND (f.RelStorn=0 OR f.RelStorn IS NULL)"
  $rd=$cmd.ExecuteReader(); $own=New-Object 'System.Collections.Generic.HashSet[string]'
  while($rd.Read()){
    $dt=$rd['d']; if($dt -is [DBNull]){ continue }; $dd=[datetime]$dt
    $key=(ToS $rd['c'])+'|'+$dd.ToString('yyyyMMdd')+'|'+([string](ToD $rd['t']))
    if($seen.Contains($key)){ continue }; [void]$own.Add($key)
    $k=ToS $rd['k']; if(-not $k){ continue }; $yy=$dd.Year
    if(-not $rev.ContainsKey($k)){ $rev[$k]=0.0; $units[$k]=0.0; $lastY[$k]=0; $cust[$k]=New-Object 'System.Collections.Generic.HashSet[int]' }
    $rev[$k]+=(ToD $rd['kc'])
    $ko=ToD $rd['ko']; if($ko -le 0){ $ko=1 }
    $units[$k]+=((ToD $rd['mn'])*$ko)
    if($yy -gt $lastY[$k]){ $lastY[$k]=$yy }
    $ad=[int](ToD $rd['ad']); if($ad -ne 0){ [void]$cust[$k].Add($ad) }
  }
  $rd.Close(); [void]$seen.UnionWith($own); $c.Close()
}

# 2) Pareto: množina kódov tvoriacich top 95 % obratu
$tot = ($rev.Values | Measure-Object -Sum).Sum
$top95 = New-Object 'System.Collections.Generic.HashSet[string]'
$cum=0.0
foreach($e in ($rev.GetEnumerator() | Sort-Object Value -Descending)){
  [void]$top95.Add($e.Key); $cum += $e.Value
  if($tot -gt 0 -and ($cum/$tot) -ge 0.95){ break }
}

# 3) SKz katalóg → produktové objekty
$c=Open (Join-Path $MdbDir "50934660_2026.mdb")
$cmd=$c.CreateCommand(); $cmd.CommandText="SELECT IDS,Nazev,MJ,MJ2Koef,ProdejKc,VNakup,StavZ FROM SKz WHERE IDS IS NOT NULL"
$rd=$cmd.ExecuteReader()
$out = New-Object System.Collections.Generic.List[object]
while($rd.Read()){
  $sku=ToS $rd['IDS']; if(-not $sku){ continue }
  $name=ToS $rd['Nazev']; $ln=(Strip $name).ToLower()
  $kind="CONSUMABLE"
  if($ln -match "davkovac|zasobnik|dispenser|stojan|drziak"){ $kind="DISPENSER" }
  elseif($ln -match "vozik|kosik na|smetiak|odpadkov"){ $kind="EQUIPMENT" }
  if($ln -match "napln|do davkovac|do zasobnik|refill|nahrad|vlozka"){ $kind="CONSUMABLE" }
  $cat = MapCat $ln $kind
  $r=0.0; if($rev.ContainsKey($sku)){ $r=$rev[$sku] }
  $ly=0;  if($lastY.ContainsKey($sku)){ $ly=$lastY[$sku] }
  $cn=0;  if($cust.ContainsKey($sku)){ $cn=$cust[$sku].Count }
  $stock = ToD $rd['StavZ']; $stocked = ($stock -gt 0)
  $shelf="ARCHIVED"
  if($ly -ge 2025){
    if($top95.Contains($sku) -or $cn -ge 10 -or $stocked){ $shelf="FEATURED" } else { $shelf="CATALOG" }
  }
  $out.Add([pscustomobject]@{
    sku=$sku; name=$name; unit=(ToS $rd['MJ']); mj2Koef=(ToD $rd['MJ2Koef'])
    basePrice=[math]::Round((ToD $rd['ProdejKc']),4); costPrice=[math]::Round((ToD $rd['VNakup']),4); stock=$stock
    productKind=$kind; categorySlug=$cat; shelfStatus=$shelf
    isStocked=$stocked; isSubsidized=($kind -eq "DISPENSER")
    revenue=[math]::Round($r,2); lastYear=$ly; customers=$cn
  })
}
$rd.Close(); $c.Close()

# 4) zápis + súhrn
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null
[System.IO.File]::WriteAllText($OutFile, ($out | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("Produktov: {0}  -> {1}" -f $out.Count, $OutFile)
Write-Output "--- shelfStatus ---"; $out | Group-Object shelfStatus | Sort-Object Count -Descending | ForEach-Object { "{0,-9} {1}" -f $_.Name,$_.Count }
Write-Output "--- productKind ---"; $out | Group-Object productKind | Sort-Object Count -Descending | ForEach-Object { "{0,-11} {1}" -f $_.Name,$_.Count }
Write-Output "--- kategórie ---"; $out | Group-Object categorySlug | Sort-Object Count -Descending | ForEach-Object { "{0,-22} {1}" -f $_.Name,$_.Count }
Write-Output "--- vzorka FEATURED (top 8 podľa obratu) ---"
$out | Where-Object { $_.shelfStatus -eq 'FEATURED' } | Sort-Object revenue -Descending | Select-Object -First 8 sku,@{N='nazov';E={$_.name.Substring(0,[math]::Min(34,$_.name.Length))}},categorySlug,productKind,@{N='cena';E={$_.basePrice}},customers | Format-Table -AutoSize | Out-String -Width 160