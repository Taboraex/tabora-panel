import { P } from '@config/obfuscation';
import {
    BuildContext,
    enumerateEndpoints,
    isTlsPort,
    renderRemark,
    selectSniHost,
    wsPath,
} from './shared';
import { base64Encode } from '@common/utils';

/**
 * Build a share URI for a single endpoint.
 *
 *   vless://<uuid>@host:port?encryption=none&security=tls&type=ws&...#remark
 *   trojan://<password>@host:port?security=tls&type=ws&...#remark
 */
export function buildUri(
    ctx: BuildContext,
    protocol: string,
    address: string,
    port: number,
    remark: string,
): string {
    const { settings, hostname } = ctx;
    const tls = isTlsPort(port);
    const { sni, host } = selectSniHost(address, hostname);

    const credential = protocol === P.TR ? ctx.trojanPassword : ctx.uuid;
    const url = new URL(`${protocol}://placeholder`);
    url.username = encodeURIComponent(credential);
    url.hostname = address;
    url.port = String(port);

    const params = url.searchParams;
    if (protocol === P.VL) params.set('encryption', 'none');
    params.set('type', 'ws');
    params.set('host', host);
    params.set('path', wsPath(protocol));
    params.set('security', tls ? 'tls' : 'none');

    if (tls) {
        params.set('sni', sni);
        params.set('fp', settings.fingerprint);
        params.set('alpn', 'http/1.1');
        if (settings.enableECH && settings.echServerName) {
            params.set('ech', settings.echServerName);
        }
    }

    url.hash = encodeURIComponent(remark);
    return url.href.replace('placeholder', address);
}

/** All URIs for the current context, one per line. */
export function buildUriList(ctx: BuildContext, infoLabels: string[] = []): string[] {
    const lines: string[] = [];
    const { settings } = ctx;

    // Informational entries first so they sit at the top of the client's list.
    for (const label of infoLabels) {
        lines.push(buildUri(ctx, ctx.protocols[0], ctx.hostname, ctx.ports[0], label));
    }

    for (const { address, port, index } of enumerateEndpoints(ctx)) {
        for (const protocol of ctx.protocols) {
            const remark = renderRemark(settings.nameTemplate, {
                index,
                prefix: settings.namePrefix,
                protocol: protocol === P.TR ? 'TR' : 'VL',
                port,
                address,
                flag: ctx.poolFlag,
                country: ctx.poolCountry,
            });
            lines.push(buildUri(ctx, protocol, address, port, remark));
        }
    }

    return lines;
}

/** Standard base64 subscription payload consumed by most clients. */
export function buildBase64Subscription(ctx: BuildContext, infoLabels: string[] = []): string {
    return base64Encode(buildUriList(ctx, infoLabels).join('\n'));
}

/** Plain (unencoded) URI list, useful for debugging and manual import. */
export function buildPlainSubscription(ctx: BuildContext, infoLabels: string[] = []): string {
    return buildUriList(ctx, infoLabels).join('\n');
}
