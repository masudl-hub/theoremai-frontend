import { useEffect, useRef } from 'react';
import { voiceLevel } from '../lib/th30-voice';

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/**
 * A knot of gas: glowing strands twisting in on themselves inside a tight, uneven envelope. The
 * envelope's edge is soft and pushed around by the same turbulence, so it never reads as a disc.
 */
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
const mat2 ROT = mat2(0.8, 0.6, -0.6, 0.8);
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; ++i) {
    v += a * noise(p);
    p = ROT * p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
// Ridged noise: bright thin creases where the noise crosses zero. These are the strands.
float strands(vec2 p) {
  float v = 0.0;
  float a = 0.6;
  for (int i = 0; i < 3; ++i) {
    v += a * pow(1.0 - abs(noise(p)), 3.0);
    p = ROT * p * 2.1 + vec2(4.1, 1.3);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;
  float speak = u_audio;

  // Twist: the closer to the middle, the further each point turns, so strands wind into the knot.
  float d0 = length(p);
  float twist = (0.5 - d0) * 5.0 + t * 0.35;
  vec2 tp = mat2(cos(twist), sin(twist), -sin(twist), cos(twist)) * p;

  // Warp the twisted space by itself, then trace strands through it.
  vec2 q = vec2(fbm(tp * 3.0 + vec2(0.0, t * 0.2)), fbm(tp * 3.0 + vec2(5.2, -t * 0.17)));
  float body = fbm(tp * 3.2 + 2.4 * q);
  float lines = strands(tp * 4.2 + 1.8 * q + vec2(t * 0.08, 0.0));

  // The envelope: a tight core whose rim is shoved in and out by the turbulence.
  float rim = d0 + body * 0.34 + (q.x - q.y) * 0.16;
  float reach = 0.30 + speak * 0.06;
  float envelope = smoothstep(reach + 0.14, reach - 0.16, rim);
  float core = exp(-d0 * d0 * 40.0);

  float density = envelope * (0.08 + 0.4 * (body + 0.5) + 1.15 * lines) + core * 0.3;
  density *= 1.0 + speak * 0.8;

  vec3 col;
  if (u_lightMode) {
    vec3 rose = vec3(0.86, 0.36, 0.42);
    vec3 amber = vec3(0.95, 0.62, 0.30);
    vec3 plum = vec3(0.52, 0.22, 0.48);
    col = mix(plum, rose, smoothstep(-0.2, 0.3, body)) * density + amber * lines * envelope * 0.35;
  } else {
    vec3 navy = vec3(0.05, 0.16, 0.55);
    vec3 teal = vec3(0.06, 0.62, 0.70);
    vec3 emerald = vec3(0.16, 0.95, 0.62);
    col = mix(navy, teal, smoothstep(-0.25, 0.25, body)) * density + emerald * lines * envelope * 0.45;
  }
  col = col / (1.0 + col * 0.6);

  float grain = (hash(gl_FragCoord.xy + fract(t * 19.33)) - 0.5) * 0.05;
  col = max(col + grain * envelope, 0.0);

  // On dark the canvas screens onto the page, so black is invisible and the rim never dims
  // what's behind it. On light it has to cover, or warm gas would vanish into a pale page.
  if (u_lightMode) {
    float alpha = clamp(dot(col, vec3(0.299, 0.587, 0.114)) * 2.6, 0.0, 1.0);
    fragColor = vec4(col * alpha, alpha);
  } else {
    fragColor = vec4(col, 1.0);
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
