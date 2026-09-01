/**
 * THEORUM sky — cumulus piles + stratocumulus banks.
 * Light overlap only; lowest bases sit on the brand baseline.
 */

export type CloudSpec = {
	id: string;
	art: string;
	size: 'sm' | 'md' | 'lg' | 'xl';
	left: string;
	/** Prefer top; use bottom for ground-hugging banks */
	top?: string;
	bottom?: string;
	opacity: number;
};

/* ── Cumulus: vertical updrafts, cauliflower domes, distinct personalities ── */

/** Towering Monarch — tall multi-tiered cauliflower with heavy shaded base */
const CUMULUS = [
	'              .  : .',
	'           .   .----.   .',
	'         .  .-(      )-.',
	'        .-(              )-.',
	'      .(    .----.          ).',
	'    .(   . (      )__         ).',
	'   (   .  (          )__ .---.  )',
	'  (  .   (   . : . .    (     )  )',
	'  ( .  .(  . : : .   . . : .   ). )',
	"   '(   .(     )__ .__(     ).   )'",
	"     '-(  . : .   (   . : .   )-'",
	"       '-(     )-' '-(     )-'",
	"          '---'   .   '---'",
	'             .  : . .'
].join('\n');

/** Asymmetrical Twin — tall dominant peak + smaller companion with saddle bridge */
const CUMULUS_TWIN = [
	'        .  : .',
	'      .  .---.                 .  .',
	'    . .-(     )-.  .        .---.',
	'   .-(           )---------(     )-.',
	' .(    .---.                        ).',
	'(   . (     )__       .---.   . : .   )',
	'(  . (         )-----(     )__     .  )',
	" '(   (   . : . .    . : .    ) .    )'",
	"   '-( ( . : : .   . . : .   )   )-'",
	"      '-(     )---(     )---'   .",
	"         '---'     '---'",
	'            .  : .    .'
].join('\n');

/** Cotton Scud — light, airy, buoyant, minimal interior clutter */
const CUMULUS_SM = [
	'        .  .',
	'     .__(   )__.',
	'   _(           )_',
	'  (   .   :   .   )',
	'  ( .   .   .   . )',
	"   '(   .   .   )'",
	"     '-( )-( )-'",
	"        '   '",
	'       .  .'
].join('\n');

/** Wind-Sheared Anvil — high crosswinds stretching the top rightward */
const CUMULUS_MID = [
	'             .  : .',
	'          .   .-----.  .   .  ~  ~',
	'        .  .-(       )__     ~  ~',
	'      . .-(             )________',
	'     .-(    .---.                )__',
	'   .(    . (     )__      . : .     )',
	'  (   .   (         )____        .   )',
	'  ( .   .(  . : . .      ) .   .    )',
	'   \'(  . ( . : : .   .  )      .  )\'',
	"     '(   .(     )__ . ) .     )-'",
	"       '-(  . : .   (   )---.-'",
	"         '-(     )-' '-(   )'",
	"            '---'       '-'",
	'               .  : . .'
].join('\n');

/* ── Stratocumulus: horizontal rolling waves, mammatus pouches, shelf fronts ── */

/** Rolling Wave Bank — organic undulating crests with floating pillow undercarriage */
const STRATO = [
	'        .  : .                     .  : .',
	'     .__(     )__.              .__(     )__.',
	'   _(             )__        .__(            )__',
	' _(    .   .         )______(     .    .        )_',
	'(   .        .    .   .        .          .    .  )',
	'( .    .   .        .   .. .       .   .         .)',
	" '(   .       .   .          .   .      .    .  )'",
	"   '-(    .            .            .       )-'",
	"      '-(   )-.______.--(   )-.______.--(   )-'",
	"         '-'             '-'             '-'",
	'            .  : .          .  : .          .  : .'
].join('\n');

/** Mammatus Tabletop — flat low-slung plate with hanging bubble pouches */
const STRATO_SM = [
	'        .  : .  .  : .',
	'    ._______________________.',
	'  .(                         ).',
	' (    .   . : . .   . : . .    )',
	' (  .   . : : .   . : : .   .  )',
	"  '(   .     .     .     .   )'",
	"    '-( )--( )---( )--( )---'",
	"       '    '     '    '",
	'      .  : .       .  :'
].join('\n');

/** Panoramic Shelf — multi-tiered stepped billows stretching across the horizon */
const STRATO_WIDE = [
	'              .  : .                                 .  : .',
	'           .__(     )__                           .__(     )__',
	'       .__(            )__                     .__(           )__',
	'    ._(     .    .        )__               ._(    .    .        )__',
	'  _(     .            .      )_____________(    .            .      )_',
	' (   .        .    .      .     .       .    .        .    .      .   )',
	' ( .    .   .        .  .. .         .          .   .        .  .. .  )',
	"  '(   .       .   .          .   .       .   .       .   .         . )'",
	"    '-(     .            .         .   .            .         .     )-'",
	"       '-(   )-.________.-(   )-.________.-(   )-.________.-(   )-'",
	"          '-'                '-'              '-'              '-'",
	'             .  : .               .  : .               .  : .'
].join('\n');

/**
 * Spaced sky seats — light edge kisses only.
 * Lowest banks use bottom:0 so their base meets the Theorum baseline.
 */
export const cloudParade: CloudSpec[] = [
	/* upper — open cumulus */
	{ id: 'cumulus-1', art: CUMULUS, size: 'lg', left: '4%', top: '2%', opacity: 0.22 },
	{ id: 'cumulus-sm-1', art: CUMULUS_SM, size: 'sm', left: '28%', top: '8%', opacity: 0.26 },
	{ id: 'cumulus-twin', art: CUMULUS_TWIN, size: 'md', left: '52%', top: '0%', opacity: 0.2 },
	{ id: 'cumulus-mid', art: CUMULUS_MID, size: 'md', left: '78%', top: '10%', opacity: 0.2 },

	/* mid — light overlap with neighbors */
	{ id: 'strato-sm-1', art: STRATO_SM, size: 'md', left: '14%', top: '38%', opacity: 0.2 },
	{ id: 'cumulus-2', art: CUMULUS, size: 'md', left: '58%', top: '36%', opacity: 0.18 },
	{ id: 'cumulus-sm-2', art: CUMULUS_SM, size: 'sm', left: '88%', top: '42%', opacity: 0.24 },

	/* ground line — bottoms flush with the brand word */
	{ id: 'strato-1', art: STRATO, size: 'xl', left: '0%', bottom: '0%', opacity: 0.18 },
	{ id: 'strato-wide', art: STRATO_WIDE, size: 'lg', left: '48%', bottom: '0%', opacity: 0.2 },
	{ id: 'strato-sm-2', art: STRATO_SM, size: 'sm', left: '72%', bottom: '2%', opacity: 0.22 }
];

/** Sparse sky for content-heavy sections — room to breathe around the thesis / map. */
export const cloudParadeSparse: CloudSpec[] = [
	{ id: 'sparse-cumulus', art: CUMULUS, size: 'md', left: '8%', top: '6%', opacity: 0.16 },
	{ id: 'sparse-twin', art: CUMULUS_TWIN, size: 'sm', left: '72%', top: '4%', opacity: 0.14 },
	{ id: 'sparse-strato', art: STRATO_SM, size: 'md', left: '18%', bottom: '6%', opacity: 0.14 },
	{ id: 'sparse-wide', art: STRATO, size: 'lg', left: '58%', bottom: '2%', opacity: 0.12 }
];

/** Open upper sky — independent of the cloud band */
export const skyStipple = [
	'  .           .                 .            .               .',
	'         .            .      .             .          .',
	'  .            .                 .                 .',
	'        .            .      .            .        .           .',
	' .            .                 .           .                 .',
	'        .            .                 .            .',
	'  .            .           .                 .           .',
	'         .            .            .       .            .',
	'  .                 .            .            .',
	'        .       .            .                 .       .',
	' .            .                 .            .',
	'        .            .      .            .            .',
	'  .            .                 .                 .',
	'         .            .            .       .',
	'  .                 .                 .            .'
].join('\n');