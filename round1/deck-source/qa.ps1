# Layout QA through PowerPoint itself: real text metrics, so overflow and orphans are measured, not guessed.
# Reports text that overflows its box, paragraphs whose last line is a single word, and shapes past the slide edge.
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$RenderDir
)
$ErrorActionPreference = 'Stop'
$pp = New-Object -ComObject PowerPoint.Application
$pres = $pp.Presentations.Open($Path, $true, $false, $false)
$issues = New-Object System.Collections.Generic.List[string]
try {
  $sw = $pres.PageSetup.SlideWidth; $sh = $pres.PageSetup.SlideHeight
  foreach ($slide in $pres.Slides) {
    $n = $slide.SlideIndex
    foreach ($shp in $slide.Shapes) {
      if ($shp.Width -lt $sw - 1 -and ($shp.Left + $shp.Width -gt $sw + 2 -or $shp.Top + $shp.Height -gt $sh + 2) -and $shp.Type -ne 13) {
        $issues.Add(("slide {0}: '{1}' extends past the slide edge" -f $n, $shp.Name))
      }
      if (-not $shp.HasTextFrame) { continue }
      $tr = $shp.TextFrame.TextRange
      if ($tr.Text.Trim().Length -eq 0) { continue }
      $bound = $shp.TextFrame2.TextRange.BoundHeight
      if ($bound -gt $shp.Height + 4) {
        $issues.Add(("slide {0}: OVERFLOW {1:N0}pt > box {2:N0}pt :: {3}" -f $n, $bound, $shp.Height, $tr.Text.Substring(0, [Math]::Min(60, $tr.Text.Length))))
      }
      for ($p = 1; $p -le $tr.Paragraphs().Count; $p++) {
        $para = $tr.Paragraphs($p)
        $lines = @()
        for ($l = 1; $l -le 12; $l++) {
          $ln = $para.Lines($l, 1)
          if ($ln.Length -eq 0) { break }
          $lines += $ln.Text.Trim()
        }
        if ($lines.Count -ge 2) {
          $last = $lines[-1]
          if (($last -split '\s+').Count -eq 1 -and $last.Length -gt 0) {
            $issues.Add(("slide {0}: ORPHAN '{1}' ends :: {2}" -f $n, $last, $para.Text.Trim().Substring(0, [Math]::Min(60, $para.Text.Trim().Length))))
          }
        }
      }
    }
    if ($RenderDir) { $slide.Export((Join-Path $RenderDir ("s-{0:D2}.png" -f $n)), "PNG", 1600, 900) }
  }
} finally {
  $pres.Close(); $pp.Quit()
}
if ($issues.Count -eq 0) { "QA: no overflow, orphans or edge problems" } else { $issues }
