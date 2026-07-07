/**
 * Render TeX math placeholders to PNG images for WeChat compatibility.
 */

import sharp from 'sharp';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: 'none' });
const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

/**
 * Rasterization scale vs. the 96 DPI baseline.
 * MathJax emits SVG sized in font-relative `ex` units; sharp/librsvg resolves
 * `ex` against the rasterization DPI, so this directly sets output pixel
 * dimensions. 3× (288 DPI) gives a high-res source that we then downscale to
 * the target display size via Lanczos, keeping inline formulas crisp.
 */
const RENDER_SCALE = 3;
const BASE_DPI = 96;

/**
 * Target display height (CSS px) for inline math. Approximates 1.2em at a
 * 16px base font, matching the inline `<img>` `height: 1.2em` style.
 *
 * The WeChat editor normalizes inline images to
 * `width: <image-px>px !important; height: auto !important` and ignores the
 * HTML `width` attribute entirely. The PNG's pixel width IS the display
 * width. So to render inline-sized formulas in WeChat, the PNG itself must
 * be the target display size; we resize the high-DPI raster to (W, H) here.
 */
const INLINE_TARGET_HEIGHT_PX = 19.2;

const MATH_PLACEHOLDER_REGEX =
  /<span class="math-image math-(inline|display)" data-latex="([^"]*)" data-display="(true|false)">[\s\S]*?<\/span>/g;

interface RenderedMathImage {
  src: string;
  width: number;
  height: number;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function extractSvg(markup: string): string {
  const match = markup.match(/<svg[\s\S]*<\/svg>/);
  if (!match) {
    throw new Error('MathJax did not produce SVG output');
  }

  return match[0].replace(/currentColor/g, '#183b56');
}

async function renderMathToPngDataUri(latex: string, display: boolean): Promise<RenderedMathImage> {
  const node = html.convert(latex, { display });
  const svgMarkup = extractSvg(adaptor.outerHTML(node));
  const density = BASE_DPI * RENDER_SCALE;
  let pipeline = sharp(Buffer.from(svgMarkup), { density });
  const naturalMeta = await pipeline.metadata();

  let width = naturalMeta.width || 0;
  let height = naturalMeta.height || 0;

  if (!display && width > 0 && height > 0) {
    // Resize the high-DPI raster to the target inline display size. See
    // INLINE_TARGET_HEIGHT_PX for why the PNG must be the display size.
    width = Math.max(1, Math.round(INLINE_TARGET_HEIGHT_PX * width / height));
    height = Math.round(INLINE_TARGET_HEIGHT_PX);
    pipeline = pipeline.resize(width, height);
  }

  const png = await pipeline.png().toBuffer();
  return {
    src: `data:image/png;base64,${png.toString('base64')}`,
    width,
    height
  };
}

function imageHtml(image: RenderedMathImage, latex: string, display: boolean): string {
  const alt = latex.replace(/"/g, '&quot;');
  const sizeAttributes =
    image.width > 0 && image.height > 0 ? ` width="${image.width}" height="${image.height}"` : '';

  if (display) {
    return `<section class="math-image-block" style="margin: 22px 0; padding: 18px 12px; overflow-x: auto; border: 1px solid #d8e7e2; border-radius: 8px; background: #ffffff; text-align: center;"><img class="math-image-rendered math-display-rendered" src="${image.src}" alt="${alt}"${sizeAttributes} style="display: block; max-width: 100%; height: auto; margin: 0 auto; border: 0;" /></section>`;
  }

  return `<img class="math-image-rendered math-inline-rendered" src="${image.src}" alt="${alt}"${sizeAttributes} style="display: inline-block; height: 1.2em; width: auto; max-width: 100%; margin: 0 0.08em; border: 0; vertical-align: -0.2em;" />`;
}

/**
 * Replace math placeholders emitted by the markdown math plugin with PNG images.
 */
export async function renderMathImages(htmlContent: string): Promise<string> {
  const replacements: Array<{ match: string; html: string }> = [];

  for (const match of htmlContent.matchAll(MATH_PLACEHOLDER_REGEX)) {
    const [fullMatch, , encodedLatex, displayValue] = match;
    const latex = decodeHtmlAttribute(encodedLatex);
    const display = displayValue === 'true';
    const renderedImage = await renderMathToPngDataUri(latex, display);
    replacements.push({
      match: fullMatch,
      html: imageHtml(renderedImage, latex, display)
    });
  }

  return replacements.reduce(
    (result, replacement) => result.replace(replacement.match, replacement.html),
    htmlContent
  );
}
