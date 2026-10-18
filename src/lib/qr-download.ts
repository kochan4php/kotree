// M56: QR exporting shared by the homepage modal and the /qr page. The SVG
// comes straight from react-qr-code; the PNG is rendered through a canvas so
// the download keeps a quiet border.

export function serializeSvg(svg: SVGSVGElement, size = 512): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  return new XMLSerializer().serializeToString(clone);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadQrSvg(svg: SVGSVGElement, filename = 'kotree-qr.svg'): void {
  downloadBlob(new Blob([serializeSvg(svg)], { type: 'image/svg+xml' }), filename);
}

export async function qrPngBlob(
  svg: SVGSVGElement,
  background: string,
  size = 512,
  pad = 48,
): Promise<Blob> {
  const svgUrl = URL.createObjectURL(new Blob([serializeSvg(svg, size)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg load failed'));
      img.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('no blob');
    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
