/**
 * Pillar card glyphs — cloud-language ASCII for the Pillars carousel.
 * Each string is a multi-line block; Pillars.svelte centers and frames it.
 */
export type PillarArtId = 'profile' | 'kernel' | 'providers' | 'guardrails' | 'observability';

export const pillarArt: Record<PillarArtId, string> = {
	// Lenticular saucer / standing mountain wave holding a crystalline vapor core
	profile: [
		'              .  : .  .          ',
		'           .__(       )__.       ',
		'        .__(  .-------.  )__.    ',
		'      _(    .(    o    ).    )_  ',
		'    .(     (   . :|: .   )     ).',
		'   (   .  ( . : --*-- : . )  .   )',
		"    '(     (   . :|: .   )     )'",
		"      '-(   '(    o    )'   )-'  ",
		"        '-(   '-------'   )-'    ",
		"           '-(         )-'       ",
		"              '---.---'          ",
		'                . : .            '
	].join('\n'),

	// Converging katabatic gorge / vortex throat
	kernel: [
		'           .  : .       .  : .           ',
		'        .__(     )__.__(     )__.        ',
		'      _(      .---.   .---.      )_      ',
		'    .(      .(     \\ /     ).      ).    ',
		'   (   .   (   . :  *  : .   )   .   )   ',
		'  (  .    (  . : : ( ) : : .  )    .  )  ',
		"   '(   .  (   . :  *  : .   )  .   )'   ",
		"     '-(    '(     / \\     )'    )-'     ",
		"        '-(   '---'   '---'   )-'        ",
		"           '-(             )-'           ",
		"              '-(   .   )-'              ",
		"                 '-----'                 ",
		'                  . : .                  '
	].join('\n'),

	// Tri-lobe confluence — three crowns into one vortex
	providers: [
		'     .  : .        .  : .        .  : .      ',
		'   .__(    )__.  .__(    )__.  .__(    )__.  ',
		'  (            )(            )(            ) ',
		"   '(   . : . )  '(   . : . )  '(   . : . )' ",
		"     '-(     )____'-(     )____'-(     )-'   ",
		'        \\    .  : .  |  .  : .    /          ',
		'         \\ .(       ) (       ). /           ',
		'          (     .   ( * )   .     )          ',
		"           '(  .   . :|: .   .  )'           ",
		"             '-(     |     )-'               ",
		"                '-(  v  )-'                  ",
		"                   '---'                     ",
		'                   . : .                     '
	].join('\n'),

	// Atmospheric inversion sieve — dense cloud into laminar mist
	guardrails: [
		'              .  : .  .  : .             ',
		'           .__(             )__.         ',
		'        .__(                   )__.      ',
		'      _(     .---.       .---.     )_    ',
		'    .(     .(     )_____(     ).     ).  ',
		'   (   .  (  . : . : | : . : .  )  .   ) ',
		'   ===================================== ',
		'    .  :  |  :  .  | : |  .  :  |  :  .  ',
		"    '-(   '-( )-.  | : |  .-( )-'   )-'  ",
		"       '-(       )-( : )-(       )-'     ",
		"          '-----'   ':'   '-----'        ",
		'             .  : .     .  : .           '
	].join('\n'),

	// Phosphorescent lightning arborization through a deep night cloud
	observability: [
		'                .  : .  .                ',
		'             .__(       )__.             ',
		'          .__(             )__.          ',
		'       ._(     .---o----.      )_        ',
		'     .(     . (    |     )__     ).      ',
		'    (   .  .(      o---.    ). .   )     ',
		'   (  .   (   . :  |    o--.  ) .   )    ',
		'   ( .  .(  . : :  o        o  ). . )    ',
		"    '(   .(        |        |   ). )'    ",
		"      '-(  . : .---o--------o-   )-'     ",
		"        '-(     )    '-(     )-'         ",
		"           '---'        '---'            ",
		'              .  : .  .  : .             '
	].join('\n')
};
