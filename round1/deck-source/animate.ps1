# Adds fade transitions and staged fade-ins to the Saakshi v3 deck, then saves with fonts embedded.
# Shapes are grouped by the names build3.js gives them: a<group>_<delay*10>_<duration*10>_<n>.
param(
  [Parameter(Mandatory = $true)][string]$InPath,
  [Parameter(Mandatory = $true)][string]$OutPath
)

$ErrorActionPreference = 'Stop'
$msoAnimEffectFade = 10
$triggerWithPrevious = 2
$triggerAfterPrevious = 3
$ppEffectFadeSmoothly = 3849
$ppSaveAsOpenXMLPresentation = 24
$msoTrue = -1

$pp = New-Object -ComObject PowerPoint.Application
$pres = $pp.Presentations.Open($InPath, $false, $false, $false)
$report = @()
try {
  foreach ($slide in $pres.Slides) {
    $slide.SlideShowTransition.EntryEffect = $ppEffectFadeSmoothly
    $slide.SlideShowTransition.Duration = [single]0.7
    $seq = $slide.TimeLine.MainSequence
    while ($seq.Count -gt 0) { $seq.Item(1).Delete() }

    $items = foreach ($shp in $slide.Shapes) {
      if ($shp.Name -match '^a(\d+)_(\d+)_(\d+)_(\d+)$') {
        [pscustomobject]@{ Shape = $shp; Group = [int]$Matches[1]; Delay = [int]$Matches[2] / 10; Dur = [int]$Matches[3] / 10; Order = [int]$Matches[4] }
      }
    }
    if (-not $items) { $report += "slide {0,2}: static" -f $slide.SlideIndex; continue }
    $groups = $items | Group-Object Group | Sort-Object { [int]$_.Name }
    foreach ($g in $groups) {
      $members = $g.Group | Sort-Object Order
      $first = $true
      foreach ($m in $members) {
        $trigger = if ($first) { $triggerAfterPrevious } else { $triggerWithPrevious }
        $eff = $seq.AddEffect($m.Shape, $msoAnimEffectFade, 0, $trigger)
        $eff.Timing.Duration = [single]$members[0].Dur
        $eff.Timing.TriggerDelayTime = if ($first) { [single]$m.Delay } else { [single]0 }
        $first = $false
      }
    }
    $report += "slide {0,2}: {1,2} reveal groups, {2,3} animated shapes" -f $slide.SlideIndex, $groups.Count, @($items).Count
  }
  $pres.SaveAs($OutPath, $ppSaveAsOpenXMLPresentation, $msoTrue)
} finally {
  $pres.Close(); $pp.Quit()
}
$report
