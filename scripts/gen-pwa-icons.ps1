$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

function New-RoundRectPath {
  param(
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $Radius * 2
  $path.AddArc($Rect.X, $Rect.Y, $d, $d, 180, 90)
  $path.AddArc($Rect.Right - $d, $Rect.Y, $d, $d, 270, 90)
  $path.AddArc($Rect.Right - $d, $Rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-PwaIcon {
  param(
    [int]$Size,
    [string]$Path
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $bgBrush = $null
  $accentBrush = $null
  $whiteBrush = $null
  $roundRectPath = $null
  $ring = $null
  $inner = $null
  $font = $null
  $format = $null
  $stripe = $null

  try {
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gfx.Clear([System.Drawing.Color]::Transparent)

    $pad = [Math]::Round($Size * 0.12)
    $rect = New-Object System.Drawing.RectangleF $pad, $pad, ($Size - (2 * $pad)), ($Size - (2 * $pad))
    $radius = [Math]::Round($Size * 0.18)

    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#0f172a'))
    $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#22c55e'))
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#f8fafc'))

    $roundRectPath = New-RoundRectPath $rect $radius
    $gfx.FillPath($bgBrush, $roundRectPath)
    $ring = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#1e293b')), ([Math]::Max(2, [Math]::Round($Size * 0.015)))
    $gfx.DrawPath($ring, $roundRectPath)

    $coin = [Math]::Round($Size * 0.24)
    $coinX = [Math]::Round(($Size - $coin) / 2)
    $coinY = [Math]::Round($Size * 0.22)
    $coinRect = New-Object System.Drawing.Rectangle $coinX, $coinY, $coin, $coin
    $gfx.FillEllipse($accentBrush, $coinRect)
    $inner = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#16a34a')), ([Math]::Max(2, [Math]::Round($Size * 0.012)))
    $gfx.DrawEllipse($inner, $coinRect)

    $fontSize = [Math]::Round($Size * 0.23)
    $font = New-Object System.Drawing.Font('Segoe UI Semibold', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF 0, ([Math]::Round($Size * 0.43)), $Size, ([Math]::Round($Size * 0.26))
    $gfx.DrawString('ET', $font, $whiteBrush, $textRect, $format)

    $stripe = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#f8fafc')), ([Math]::Max(2, [Math]::Round($Size * 0.012)))
    $gfx.DrawLine($stripe, ([Math]::Round($Size * 0.33)), ([Math]::Round($Size * 0.67)), ([Math]::Round($Size * 0.67)), ([Math]::Round($Size * 0.67)))

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $gfx.Dispose()
    $bmp.Dispose()
    if ($bgBrush) { $bgBrush.Dispose() }
    if ($accentBrush) { $accentBrush.Dispose() }
    if ($whiteBrush) { $whiteBrush.Dispose() }
    if ($roundRectPath) { $roundRectPath.Dispose() }
    if ($ring) { $ring.Dispose() }
    if ($inner) { $inner.Dispose() }
    if ($font) { $font.Dispose() }
    if ($format) { $format.Dispose() }
    if ($stripe) { $stripe.Dispose() }
  }
}

New-PwaIcon 192 (Join-Path $iconsDir 'icon-192.png')
New-PwaIcon 512 (Join-Path $iconsDir 'icon-512.png')
Copy-Item -Force (Join-Path $iconsDir 'icon-192.png') (Join-Path $iconsDir 'icon-192-maskable.png')
Copy-Item -Force (Join-Path $iconsDir 'icon-512.png') (Join-Path $iconsDir 'icon-512-maskable.png')
