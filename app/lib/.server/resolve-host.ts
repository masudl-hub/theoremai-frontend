/**
 * The name resolver the site hands the kernel's network guard. Workers have no DNS lookup, so names
 * resolve over Cloudflare's DNS JSON API; a name that answers a private address is refused.
 */
import { dnsOverHttpsResolver } from '@theoremai/agents';

export const resolveHost = dnsOverHttpsResolver({
	endpoint: 'https://cloudflare-dns.com/dns-query',
});
