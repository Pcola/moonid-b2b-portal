# Overí pokrytie podľa ZNAČIEK (nezávislé od párovania kódov/názvov):
# koľko Pohoda produktov je značiek, ktoré humed feed obsahuje vs neobsahuje.
$ErrorActionPreference = 'Stop'
$feedPath = 'C:\Users\lukas\Downloads\feed.xml'
$mdb      = 'C:\Users\lukas\Downloads\mdb\50934660_2026.mdb'

function StripDia([string]$s){
  if([string]::IsNullOrWhiteSpace($s)){return ''}
  $n = $s.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach($ch in $n.ToCharArray()){ if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark){ [void]$sb.Append($ch) } }
  ($sb.ToString()).ToLower()
}

# značky: prémiové (Moonid web) + humed + bežné
$brands = @(
  'tork','katrin','lotus','vileda','leifheit','sanytol','aquarius','scott','kleenex','wypall','hostess','kimberly',
  'sidolux','savo','rulopak','merida',
  'jar','fairy','pur','cif','domestos','ajax','bref','clin','krystal','fixinela','larrin','dezox','well done','pronto','mr proper','mr. proper','cillit','glanc','iron','real'
)

# ---------- FEED ----------
$raw = Get-Content $feedPath -Raw
$titles = [regex]::Matches($raw, '(?s)<g:title>(.*?)</g:title>') | ForEach-Object { StripDia $_.Groups[1].Value }
$feedBrandCount = @{}
foreach($b in $brands){ $feedBrandCount[$b] = 0 }
foreach($t in $titles){ foreach($b in $brands){ if($t -like "*$b*"){ $feedBrandCount[$b]++ } } }

# ---------- POHODA SKz ----------
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$mdb;")
$conn.Open()
$cmd = $conn.CreateCommand(); $cmd.CommandText = "SELECT Nazev FROM SKz"
$rdr = $cmd.ExecuteReader()
$names = New-Object System.Collections.Generic.List[string]
while($rdr.Read()){ if($rdr['Nazev'] -ne [DBNull]::Value){ $names.Add((StripDia ([string]$rdr['Nazev']))) } }
$rdr.Close(); $conn.Close()

$pohBrandCount = @{}
foreach($b in $brands){ $pohBrandCount[$b] = 0 }
$pohWithAnyBrand = 0; $pohBrandInFeed = 0; $pohBrandNotInFeed = 0
foreach($n in $names){
  $hit = $false; $inFeed = $false
  foreach($b in $brands){
    if($n -like "*$b*"){
      $pohBrandCount[$b]++
      $hit = $true
      if($feedBrandCount[$b] -gt 0){ $inFeed = $true }
    }
  }
  if($hit){ $pohWithAnyBrand++; if($inFeed){ $pohBrandInFeed++ } else { $pohBrandNotInFeed++ } }
}
$total = $names.Count

Write-Output ("POHODA SKz produktov: {0}" -f $total)
Write-Output ("S rozpoznanou znackou: {0} ({1:P0})  |  bez rozpoznanej znacky (genericke): {2} ({3:P0})" -f $pohWithAnyBrand, ($pohWithAnyBrand/$total), ($total-$pohWithAnyBrand), (($total-$pohWithAnyBrand)/$total))
Write-Output ("  z toho znacka JE vo feede: {0}  |  znacka NIE je vo feede: {1}" -f $pohBrandInFeed, $pohBrandNotInFeed)
Write-Output ""
Write-Output ("{0,-14} {1,8} {2,8}" -f 'ZNACKA','POHODA','FEED')
Write-Output ("-" * 32)
foreach($b in ($brands | Sort-Object { $pohBrandCount[$_] } -Descending)){
  if($pohBrandCount[$b] -gt 0 -or $feedBrandCount[$b] -gt 0){
    Write-Output ("{0,-14} {1,8} {2,8}" -f $b, $pohBrandCount[$b], $feedBrandCount[$b])
  }
}
