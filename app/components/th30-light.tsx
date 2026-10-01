import { useEffect, useRef } from 'react';
import { voiceLevel } from '../lib/th30-voice';

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/** Two drifting, domain-warped glows. No edge or ring: the gas dissolves before the canvas ends. */
const FRAGMENT = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio;
uniform bool u_lightMode;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i), f), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0)), f - vec2(1.0)), u.x),
    u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(cos(0.52), sin(0.52), -sin(0.52), cos(0.52));
  for (int i = 0; i < 4; ++i) {
    v += a * noise(p);
    p = rot * p * 2.0 + vec2(100.0);
    a *= 0.5;
  }
  return v;
}
float glow(float d, float core, float aura, float k) {
  return (exp(-abs(d) * core) * 0.38 + 0.65 / (1.0 + abs(d) * aura)) * k;
}

void main() {
  vec2 frame = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  // The gas's own space: zoomed out so it fits the canvas, and centred between its two cores.
  vec2 uv = frame * 0.85 + vec2(0.11, 0.0);
  float t = u_time * 0.38;
  float level = 1.95 + u_audio * 0.9;

  vec2 q = vec2(fbm(uv + vec2(0.0, t * 0.18)), fbm(uv + vec2(5.2, 1.3 - t * 0.12)));
  vec2 r = vec2(fbm(uv + 3.8 * q + vec2(1.7 - t * 0.14, 9.2)), fbm(uv + 3.8 * q + vec2(8.3, 2.8 + t * 0.10)));
  float f = fbm(uv * 1.8 + 2.8 * r);

  vec2 core1 = vec2(-0.10 + sin(t * 0.4) * 0.05, 0.02 + cos(t * 0.28) * 0.04);
  vec2 core2 = vec2(0.32 + cos(t * 0.35) * 0.04, -0.06 + sin(t * 0.22) * 0.03);
  float d1 = length(uv - core1);
  float d2 = length(uv - core2);
  float a = glow(d1 + f * 0.40 - 0.03, 7.2, 3.6, level);
  float b = glow(d1 + f * 0.36, 10.2, 4.3, level);
  float c = glow(d1 + f * 0.32 + 0.04, 5.8, 2.5, level);
  float lobe = glow(d2 + f * 0.28, 10.8, 4.8, level * 0.70);

  vec3 col;
  if (u_lightMode) {
    col = vec3(a * 1.05 + c * 0.88 + lobe * 0.72, a * 0.36 + c * 0.46 + lobe * 0.26, a * 0.44 + c * 0.16 + lobe * 0.62);
    col = pow(col / (1.0 + col * 0.78), vec3(1.16)) * 0.84;
  } else {
    col = vec3(a * 0.03 + c * 0.05 + lobe * 0.04, a * 0.82 + b * 0.52 + lobe * 0.24, c * 1.18 + b * 0.42 + lobe * 0.94);
    col = pow(col / (1.0 + col * 0.92), vec3(1.24)) * 0.76;
  }

  // Speech swells the footprint. The frame fade only guarantees nothing reaches the canvas edge.
  float limit = 0.4 + u_audio * 0.16;
  float warped = length(uv + r * 0.42) - f * 0.22;
  col *= smoothstep(limit * 1.45, limit * 0.35, warped) * smoothstep(0.5, 0.26, length(frame));
  col = max(col - 0.012, 0.0);

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float grain = (hash(gl_FragCoord.xy + fract(u_time * 19.33)) - 0.5) * 0.06 * (u_lightMode ? 0.68 : 1.0);
  col = max(col + grain * (0.28 + 0.72 * lum) * smoothstep(0.001, 0.08, lum), 0.0);
  // On dark the canvas screens onto the page, so black is invisible and the fringe never dims
  // what's behind it. On light it has to cover, or warm gas would vanish into a pale page.
  if (u_lightMode) {
    float alpha = clamp(lum * 2.15, 0.0, 1.0);
    fragColor = vec4(col * alpha, alpha);
  } else {
    fragColor = vec4(col * clamp(lum * 2.4, 0.0, 1.0) * 1.7, 1.0);
  }
}
`;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * th30's light. One tiny WebGL canvas with no dependencies. It draws only while on screen, at
 * about 30fps when the call is quiet and every frame while someone speaks, and holds a single
 * still frame for reduced motion.
 */
export function Th30Light({ theme, className }: { theme: 'dark' | 'system'; className?: string }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const gl = canvas?.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
		if (!canvas || !gl) {
			canvas?.setAttribute('data-fallback', '');
			return;
		}
		const shader = (type: number, source: string) => {
			const s = gl.createShader(type);
			if (!s) return null;
			gl.shaderSource(s, source);
			gl.compileShader(s);
			return s;
		};
		const vert = shader(gl.VERTEX_SHADER, VERTEX);
		const frag = shader(gl.FRAGMENT_SHADER, FRAGMENT);
		const program = gl.createProgram();
		if (!vert || !frag) return;
		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			canvas.setAttribute('data-fallback', '');
			return;
		}
		// biome-ignore lint/correctness/useHookAtTopLevel: WebGL, not a React hook.
		gl.useProgram(program);
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const position = gl.getAttribLocation(program, 'a_position');
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
		const uResolution = gl.getUniformLocation(program, 'u_resolution');
		const uTime = gl.getUniformLocation(program, 'u_time');
		const uAudio = gl.getUniformLocation(program, 'u_audio');
		const uLight = gl.getUniformLocation(program, 'u_lightMode');

		const scheme = window.matchMedia('(prefers-color-scheme: light)');
		const paintScheme = () => {
			const light = theme === 'system' && scheme.matches;
			gl.uniform1i(uLight, light ? 1 : 0);
			canvas.style.mixBlendMode = light ? '' : 'screen';
		};
		paintScheme();
		scheme.addEventListener('change', paintScheme);

		const size = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
			canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform2f(uResolution, canvas.width, canvas.height);
		};
		size();

		const start = performance.now();
		let audio = 0;
		let frame = 0;
		let last = 0;
		let visible = false;
		const draw = (now: number) => {
			audio += (voiceLevel() - audio) * 0.18;
			gl.uniform1f(uTime, ((now - start) / 1000) * 0.8);
			gl.uniform1f(uAudio, audio);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};
		const tick = (now: number) => {
			frame = requestAnimationFrame(tick);
			if (audio < 0.02 && now - last < 32) return;
			last = now;
			draw(now);
		};
		const still = reducedMotion();
		const observer = new IntersectionObserver((entries) => {
			visible = entries.some((entry) => entry.isIntersecting);
			cancelAnimationFrame(frame);
			if (!visible) return;
			if (still) draw(start + 4000);
			else frame = requestAnimationFrame(tick);
		});
		observer.observe(canvas);
		const resize = new ResizeObserver(() => {
			size();
			if (still && visible) draw(start + 4000);
		});
		resize.observe(canvas);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			resize.disconnect();
			scheme.removeEventListener('change', paintScheme);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.deleteShader(vert);
			gl.deleteShader(frag);
		};
	}, [theme]);

	return (
		<canvas
			ref={ref}
			className={className ? `th30-light ${className}` : 'th30-light'}
			aria-hidden
		/>
	);
}
