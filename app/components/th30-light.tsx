import { useEffect, useRef } from 'react';
import { voiceLevel } from '../lib/th30-voice';

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/**
 * A knot of gas: two layers of glowing strands winding opposite ways, by uneven amounts, inside a
 * tight envelope whose soft rim the same turbulence shoves in and out. Hover tightens the knot and
 * turns it towards violet.
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

mat2 turn(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}

// Three hues blended round a loop, so a colour can keep moving instead of landing.
vec3 cycle(float h, vec3 a, vec3 b, vec3 c) {
  h = fract(h) * 3.0;
  if (h < 1.0) return mix(a, b, smoothstep(0.0, 1.0, h));
  if (h < 2.0) return mix(b, c, smoothstep(1.0, 2.0, h));
  return mix(c, a, smoothstep(2.0, 3.0, h));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time;
  float speak = u_audio;
  float hover = u_hover;

  // The knot wanders a little around the middle rather than spinning in place.
  p -= 0.035 * vec2(sin(t * 0.31), cos(t * 0.23));
  float d0 = length(p);

  // Two layers wind opposite ways, each by an amount that varies across the knot, so strands
  // cross and tangle instead of all spiralling into one eye.
  float pull = (0.5 - d0) * (1.0 + hover * 0.6);
  float na = noise(p * 2.3 + vec2(t * 0.11, 3.1));
  float nb = noise(p * 2.1 + vec2(7.4, -t * 0.09));
  // Hover stirs it: an extra twist, strongest in the middle, that winds up as hover eases in.
  float stir = hover * (0.55 - d0) * (2.4 + 1.2 * sin(t * 0.37));
  vec2 pa = turn(pull * (2.6 + 3.2 * na) + t * 0.21 + stir) * p;
  vec2 pb = turn(-pull * (2.2 + 3.0 * nb) - t * 0.17 + 1.9 + stir * 0.6) * p;

  vec2 ps = turn(stir * 0.8) * p;
  vec2 q = vec2(fbm(ps * 2.8 + vec2(0.0, t * 0.16)), fbm(ps * 2.8 + vec2(5.2, -t * 0.13)));
  float body = fbm(p * 3.0 + 2.2 * q);
  float scale = 4.0 + hover * 1.2;
  float lines = max(strands(pa * scale + 1.6 * q), strands(pb * (scale * 0.9) - 1.4 * q + 3.7) * 0.85);

  // The envelope: a tight core whose rim is shoved in and out by the turbulence.
  float rim = d0 + body * 0.34 + (q.x - q.y) * 0.16;
  float reach = 0.30 + speak * 0.06 + hover * 0.025;
  float envelope = smoothstep(reach + 0.14, reach - 0.16, rim);
  float core = exp(-d0 * d0 * 40.0);

  float density = envelope * (0.08 + 0.4 * (body + 0.5) + 1.15 * lines) + core * 0.3;
  density *= 1.0 + speak * 0.8 + hover * 0.25;

  // Hover colour bleeds in from the core along the turbulence, then keeps drifting through its
  // hues; on leave it ebbs back out the same way.
  float bleed = smoothstep(0.0, 0.45, hover * 1.5 - d0 * 1.6 - body * 0.5 + 0.1);
  float hue = t * 0.09 + body * 1.3 + q.x * 1.1 + d0 * 1.8;

  vec3 col;
  if (u_lightMode) {
    vec3 tint = cycle(hue, vec3(0.62, 0.30, 0.80), vec3(0.95, 0.38, 0.58), vec3(0.98, 0.56, 0.34));
    vec3 rose = mix(vec3(0.86, 0.36, 0.42), tint, bleed);
    vec3 amber = mix(vec3(0.95, 0.62, 0.30), mix(tint, vec3(1.0, 0.85, 0.7), 0.3), bleed);
    vec3 plum = mix(vec3(0.52, 0.22, 0.48), tint * 0.6, bleed);
    col = mix(plum, rose, smoothstep(-0.2, 0.3, body)) * density + amber * lines * envelope * 0.35;
  } else {
    vec3 tint = cycle(hue, vec3(0.46, 0.30, 1.0), vec3(0.90, 0.32, 0.86), vec3(0.22, 0.56, 1.0));
    vec3 navy = mix(vec3(0.05, 0.16, 0.55), tint * 0.35, bleed);
    vec3 teal = mix(vec3(0.06, 0.62, 0.70), tint, bleed);
    vec3 emerald = mix(vec3(0.16, 0.95, 0.62), mix(tint, vec3(1.0), 0.4), bleed);
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
