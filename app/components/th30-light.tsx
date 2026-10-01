import { useEffect, useRef } from 'react';
import { voiceLevel } from '../lib/th30-voice';

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/**
 * A small cumulus: soft puffs merged into one silhouette, flatter underneath, with a cauliflower
 * rim of billows at two scales. Lit from above, so the tops glow and the belly sinks into shadow.
 * The billows drift on a slow wind; speaking swells it, and hover stirs it and turns it violet.
 */
const FRAGMENT = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_audio;
uniform bool u_lightMode;
uniform float u_hover;

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
// Billows: rounded bumps with soft, rounded creases between them, the texture of a cloud's surface.
float billows(vec2 p) {
  float v = 0.0;
  float a = 0.6;
  for (int i = 0; i < 3; ++i) {
    float n = noise(p);
    v += a * sqrt(n * n + 0.012);
    p = ROT * p * 2.1 + vec2(4.1, 1.3);
    a *= 0.5;
  }
  return v;
}

mat2 turn(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// The silhouette: puffs that bob a little, merged softly, with the base pressed flatter.
float cloud(vec2 p, float t) {
  float d = length(p - vec2(-0.21, -0.03 + 0.010 * sin(t * 0.50))) - 0.12;
  d = smin(d, length(p - vec2(-0.07, 0.085 + 0.012 * sin(t * 0.41 + 1.0))) - 0.165, 0.07);
  d = smin(d, length(p - vec2(0.12, 0.03 + 0.010 * sin(t * 0.37 + 2.0))) - 0.15, 0.07);
  d = smin(d, length(p - vec2(0.26, -0.05 + 0.008 * sin(t * 0.45 + 3.0))) - 0.10, 0.07);
  d = smin(d, length(p - vec2(0.02, -0.08)) - 0.15, 0.07);
  return -smin(-d, p.y + 0.15, 0.05);
}

// The lumpy rim as a field: below zero is inside. ps is the stirred frame, q the warp.
float surface(vec2 c, vec2 ps, vec2 q, vec2 wind, float t, float swell) {
  float big = billows(ps * 8.0 + 1.2 * q - wind);
  float fine = billows(ps * 17.0 + 2.0 * q - wind * 1.6 + 7.3);
  return cloud(c, t) - 0.065 * big - 0.045 * fine - swell + 0.045;
}

// Read as a heap of domes: height rises from the rim inwards, so every billow gets a crown.
float dome(float e) {
  return sqrt(clamp(-e / 0.12, 0.0, 1.0));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;
  float speak = u_audio;
  float hover = u_hover;

  // It drifts a little around the middle; c is the cloud's own frame, centred on the canvas.
  p -= vec2(0.025 * sin(t * 0.21), 0.018 * cos(t * 0.29));
  vec2 c = p + vec2(0.025, 0.05);
  float d0 = length(p);

  // Hover stirs the billows: a twist, strongest in the middle, that winds up as hover eases in.
  float stir = hover * (0.5 - d0) * (2.4 + 1.2 * sin(t * 0.37));
  vec2 ps = turn(stir) * p;
  vec2 q = vec2(fbm(ps * 3.0 + vec2(t * 0.10, 0.0)), fbm(ps * 3.0 + vec2(5.2, -t * 0.08)));
  vec2 wind = vec2(t * 0.06, 0.0);
  float big = billows(ps * 8.0 + 1.2 * q - wind);

  // The rim: the silhouette pushed out by billows at two scales, swelling as th30 speaks.
  float swell = speak * 0.03 + hover * 0.012;
  float edge = surface(c, ps, q, wind, t, swell);
  float density = smoothstep(0.028, -0.03, edge);

  // Light from the upper left on the domes' slopes: lit crowns, shaded undersides, and dark
  // creases where billows meet. The belly sits a little deeper in shadow overall.
  const float E = 0.016;
  float h = dome(edge);
  float hx = dome(surface(c + vec2(E, 0.0), ps + vec2(E, 0.0), q, wind, t, swell));
  float hy = dome(surface(c + vec2(0.0, E), ps + vec2(0.0, E), q, wind, t, swell));
  vec3 n = normalize(vec3(-(hx - h) / E, -(hy - h) / E, 9.0));
  float diffuse = max(dot(n, normalize(vec3(-0.45, 0.75, 0.55))), 0.0);
  float crown = smoothstep(-0.16, 0.2, c.y);
  float shade = (0.42 + 0.68 * diffuse) * mix(0.72, 1.05, crown);
  density *= 1.0 + speak * 0.8 + hover * 0.25;

  // Hover colour bleeds in from the middle along the billows, and ebbs back out the same way.
  float bleed = smoothstep(0.0, 0.45, hover * 1.5 - d0 * 1.6 - big * 0.5 + 0.1);

  vec3 col;
  if (u_lightMode) {
    vec3 plum = vec3(0.52, 0.22, 0.48);
    vec3 rose = mix(vec3(0.86, 0.36, 0.42), vec3(0.70, 0.30, 0.78), bleed);
    vec3 amber = mix(vec3(0.95, 0.62, 0.30), vec3(0.98, 0.45, 0.55), bleed);
    col = mix(plum, rose, smoothstep(0.2, 0.6, shade));
    col = mix(col, amber, smoothstep(0.65, 1.1, shade));
  } else {
    vec3 navy = mix(vec3(0.05, 0.16, 0.55), vec3(0.22, 0.10, 0.62), bleed);
    vec3 teal = mix(vec3(0.06, 0.62, 0.70), vec3(0.42, 0.40, 0.95), bleed);
    vec3 emerald = mix(vec3(0.16, 0.95, 0.62), vec3(0.70, 0.78, 1.0), bleed);
    col = mix(navy, teal, smoothstep(0.2, 0.6, shade));
    col = mix(col, emerald, smoothstep(0.65, 1.1, shade));
  }
  col *= density * 1.15;
  col = col / (1.0 + col * 0.6);

  float grain = (hash(gl_FragCoord.xy + fract(t * 19.33)) - 0.5) * 0.05;
  col = max(col + grain * density, 0.0);

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
		const uHover = gl.getUniformLocation(program, 'u_hover');

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

		const still = reducedMotion();
		let clock = 4;
		let audio = 0;
		let hovering = 0;
		let hover = 0;
		let frame = 0;
		let last = performance.now();
		let visible = false;
		const draw = (dt: number) => {
			audio += (voiceLevel() - audio) * 0.18;
			// Slow both ways, so the colour has time to swirl in and ebb out rather than switch.
			const rate = hovering ? 1.3 : 0.8;
			hover = still ? hovering : hover + (hovering - hover) * Math.min(1, dt * rate);
			// Hover quickens the drift as well as tightening the knot.
			clock += dt * (0.8 + hover * 0.9);
			gl.uniform1f(uTime, clock);
			gl.uniform1f(uAudio, audio);
			gl.uniform1f(uHover, hover);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};
		const tick = (now: number) => {
			frame = requestAnimationFrame(tick);
			const calm = audio < 0.02 && hovering === 0 && hover < 0.01;
			if (calm && now - last < 32) return;
			draw(Math.min(0.1, (now - last) / 1000));
			last = now;
		};

		// Hovering or focusing the button around the light.
		const target = canvas.parentElement;
		const setHover = (on: boolean) => () => {
			hovering = on ? 1 : 0;
			if (still && visible) draw(0);
		};
		const enter = setHover(true);
		const leave = setHover(false);
		target?.addEventListener('pointerenter', enter);
		target?.addEventListener('pointerleave', leave);
		target?.addEventListener('focusin', enter);
		target?.addEventListener('focusout', leave);
		const observer = new IntersectionObserver((entries) => {
			visible = entries.some((entry) => entry.isIntersecting);
			cancelAnimationFrame(frame);
			if (!visible) return;
			if (still) draw(0);
			else {
				last = performance.now();
				frame = requestAnimationFrame(tick);
			}
		});
		observer.observe(canvas);
		const resize = new ResizeObserver(() => {
			size();
			if (still && visible) draw(0);
		});
		resize.observe(canvas);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			resize.disconnect();
			target?.removeEventListener('pointerenter', enter);
			target?.removeEventListener('pointerleave', leave);
			target?.removeEventListener('focusin', enter);
			target?.removeEventListener('focusout', leave);
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
