import { useEffect, useRef } from "react";
import {
  mrfCrestAt,
  mrfEase,
  mrfHex,
  mrfLayerSpec,
  mrfMistBand,
  mrfNoiseTable,
  mrfPaintLayer,
  mrfSmooth,
} from "./ui/meadow-rise-footer.jsx";

const SKY = ["#f4f4ef", "#e9ece3"];
const HAZE = "#e3e7dc";
const GLOW = "#fffbef";
const GROUND = "#253019";
const HILLS = [
  ["#b7c2ab", "#9fac95"],
  ["#a3b384", "#7d8f63"],
  ["#93a964", "#677c42"],
  ["#829a52", "#556a33"],
  ["#6c8240", "#415325"],
  ["#4d5d2c", "#283318"],
];

const MX = 40;

export default function MeadowLandscape({ seed = 17, className = "" }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rgb = (value, fallback) => mrfHex(value) || fallback;
    const sky0 = rgb(SKY[0], [244, 244, 239]);
    const sky1 = rgb(SKY[1], [233, 236, 227]);
    const haze = rgb(HAZE, sky1);
    const glow = rgb(GLOW, [255, 251, 239]);
    const ground = rgb(GROUND, [37, 48, 25]);
    const hillColors = HILLS.map(([lit, shadow]) => [
      rgb(lit, [120, 140, 80]),
      rgb(shadow, [80, 100, 50]),
    ]);
    const css = (color, alpha) =>
      "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + alpha + ")";
    const noise = mrfNoiseTable(seed);
    const specs = hillColors.map((_, index) => mrfLayerSpec(index, hillColors.length, seed));

    let width = 1;
    let height = 1;
    let scale = 1;
    let layers = specs.map(() => null);
    let building = specs.length;
    let builtFor = "";
    let mistCanvas = null;
    let revealAt = null;
    let startedAt = 0;
    let last = 0;
    let raf = 0;
    let job = null;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    let rebuildTimer = 0;

    const makeMist = () => {
      const w = 320;
      const h = 64;
      const alpha = mrfMistBand(noise, w, h);
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;
      const image = offCtx.createImageData(w, h);
      for (let i = 0; i < alpha.length; i += 1) {
        image.data[i * 4] = haze[0];
        image.data[i * 4 + 1] = haze[1];
        image.data[i * 4 + 2] = haze[2];
        image.data[i * 4 + 3] = alpha[i] * 255;
      }
      offCtx.putImageData(image, 0, 0);
      mistCanvas = offscreen;
    };

    const startJob = (index) => {
      const spec = specs[index];
      let minCrest = Infinity;
      for (let x = -MX; x <= width + MX; x += 3) {
        minCrest = Math.min(minCrest, mrfCrestAt(spec, x, width, height));
      }
      const top = Math.floor(minCrest - 4);
      const layerScale = Math.min(window.devicePixelRatio || 1, spec.q > 0.5 ? 1.25 : 1);
      const w = Math.ceil((width + MX * 2) * layerScale);
      const h = Math.ceil((height - top) * layerScale);
      const offscreen = document.createElement("canvas");
      const offCtx = h > 0 ? offscreen.getContext("2d") : null;
      if (!offCtx) {
        layers[index] = null;
        return null;
      }
      offscreen.width = w;
      offscreen.height = h;
      const options = {
        s: layerScale,
        mx: MX,
        top,
        W: width,
        H: height,
        spec,
        lit: hillColors[index][0],
        shadow: hillColors[index][1],
        haze,
        noise,
        detailTo: height + 1,
      };
      return {
        i: index,
        c: offscreen,
        g: offCtx,
        img: offCtx.createImageData(w, h),
        o: options,
        w,
        h,
        col: 0,
      };
    };

    const work = (budget) => {
      const from = performance.now();
      while (building < specs.length && performance.now() - from < budget) {
        if (!job) job = startJob(building);
        if (!job) {
          building += 1;
          continue;
        }
        const next = Math.min(job.w, job.col + 48);
        mrfPaintLayer(job.img.data, job.w, job.h, job.o, job.col, next);
        job.col = next;
        if (job.col >= job.w) {
          job.g.putImageData(job.img, 0, 0);
          layers[job.i] = {
            c: job.c,
            top: job.o.top,
            w: job.w / job.o.s,
            h: job.h / job.o.s,
          };
          job = null;
          building += 1;
        }
      }
    };

    const draw = (now) => {
      const elapsed = revealAt === null ? -1 : now - revealAt;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      const sky = ctx.createLinearGradient(0, 0, 0, height * 0.82);
      sky.addColorStop(0, css(sky0, 1));
      sky.addColorStop(1, css(sky1, 1));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const sx = width * (0.72 + px * 0.025);
      const sy = height * 0.16 + py * height * 0.035;
      const dawn = elapsed < 0 ? 0 : mrfSmooth(0, 900, elapsed);
      const radius = Math.max(width, height) * 0.66;
      const glowGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      glowGradient.addColorStop(0, css(glow, 0.85 * dawn));
      glowGradient.addColorStop(0.34, css(glow, 0.32 * dawn));
      glowGradient.addColorStop(1, css(glow, 0));
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);

      for (let index = 0; index < (elapsed < 0 ? 0 : specs.length); index += 1) {
        const layer = layers[index];
        if (!layer) continue;
        const riseIn = mrfEase((elapsed - 40 - index * 65) / 980);
        const rise = (1 - riseIn) * height * (0.1 + index * 0.035);
        const driftX = -px * (3 + index * 5);
        const driftY = -py * (2 + index * 3);
        ctx.drawImage(
          layer.c,
          -MX + driftX,
          layer.top + rise + driftY,
          layer.w,
          layer.h
        );
        if (mistCanvas && index > 0 && index < specs.length - 1 && index % 2 === 1) {
          const bandWidth = width * 1.55;
          const bandHeight = height * (index === 1 ? 0.2 : 0.16);
          const shift = reduced ? 0 : ((now * (5 + index * 2)) / 1000) % bandWidth;
          ctx.globalAlpha = 0.58 * mrfSmooth(500, 1500, elapsed);
          ctx.drawImage(
            mistCanvas,
            -shift + driftX,
            height * specs[index + 1].base - bandHeight * 0.68 + rise * 0.5,
            bandWidth,
            bandHeight
          );
          ctx.drawImage(
            mistCanvas,
            bandWidth - shift + driftX,
            height * specs[index + 1].base - bandHeight * 0.68 + rise * 0.5,
            bandWidth,
            bandHeight
          );
          ctx.globalAlpha = 1;
        }
      }

      const fog = elapsed < 0 ? 1 : 1 - mrfSmooth(40, 850, elapsed);
      if (fog > 0) {
        const fogGradient = ctx.createLinearGradient(0, 0, 0, height);
        fogGradient.addColorStop(0, css(sky0, fog));
        fogGradient.addColorStop(1, css(sky1, fog));
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, 0, width, height);
      }

      const groundGradient = ctx.createLinearGradient(0, height * 0.76, 0, height);
      groundGradient.addColorStop(0, css(ground, 0));
      groundGradient.addColorStop(0.7, css(ground, 0.5));
      groundGradient.addColorStop(1, css(ground, 0.96));
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, height * 0.76, width, height * 0.24);
    };

    const tick = (now) => {
      raf = 0;
      if (building < specs.length) work(18);
      if (revealAt === null && building >= specs.length) {
        revealAt = reduced ? -1e9 : now;
        startedAt = now;
      }
      const intro =
        revealAt !== null &&
        (reduced || now - (revealAt > 0 ? revealAt : startedAt) < 4600);
      const easing =
        Math.abs((reduced ? 0 : tx) - px) > 0.001 ||
        Math.abs((reduced ? 0 : ty) - py) > 0.001;
      px += ((reduced ? 0 : tx) - px) * 0.065;
      py += ((reduced ? 0 : ty) - py) * 0.065;
      if (building < specs.length || intro || easing || now - last > 34) {
        draw(now);
        last = now;
      }
      if (building < specs.length || intro || easing) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const measure = () => {
      width = Math.max(1, root.clientWidth);
      height = Math.max(1, root.clientHeight);
      scale = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.round(width * scale);
      const nextH = Math.round(height * scale);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      const signature = width + "x" + height;
      if (signature !== builtFor) {
        window.clearTimeout(rebuildTimer);
        const first = builtFor === "";
        builtFor = signature;
        const rebuild = () => {
          building = 0;
          job = null;
          layers = specs.map(() => null);
          makeMist();
          wake();
        };
        if (first) rebuild();
        else rebuildTimer = window.setTimeout(rebuild, 150);
      }
    };

    const onMove = (event) => {
      if (reduced) return;
      tx = Math.max(-0.5, Math.min(0.5, event.clientX / window.innerWidth - 0.5));
      ty = Math.max(-0.5, Math.min(0.5, event.clientY / window.innerHeight - 0.5));
      wake();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      wake();
    };

    measure();
    draw(performance.now());
    wake();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    const observer = new ResizeObserver(() => {
      measure();
      draw(performance.now());
      wake();
    });
    observer.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(rebuildTimer);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [seed]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
