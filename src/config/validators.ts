import { Settings } from '#types/settings';
import { isDomain, isIPv4, isIPv6, isValidUUID, isValidUrl, parseHostPort } from '@common/utils';

export interface ValidationError {
    field: string;
    messages: string[];
}

type Validator = (form: Partial<Settings>, errors: ValidationError[]) => void;

const push = (errors: ValidationError[], field: string, message: string) => {
    const existing = errors.find((e) => e.field === field);
    if (existing) existing.messages.push(message);
    else errors.push({ field, messages: [message] });
};

const isHostLike = (value: string): boolean =>
    isIPv4(value) || isIPv6(value) || isDomain(value);

/* ------------------------------------------------------------- validators */

const validateUUID: Validator = (form, errors) => {
    if (form.uuid !== undefined && form.uuid && !isValidUUID(form.uuid)) {
        push(errors, 'uuid', 'Must be a valid v4 UUID.');
    }
};

const validateTrojanPassword: Validator = (form, errors) => {
    if (form.trojanPassword !== undefined && form.trojanPassword.length < 8) {
        push(errors, 'trojanPassword', 'Must be at least 8 characters.');
    }
};

const validateSecurePath: Validator = (form, errors) => {
    if (form.securePath === undefined) return;
    if (form.securePath.length < 3) {
        push(errors, 'securePath', 'Must be at least 3 characters.');
    }
    if (!/^[A-Za-z0-9_-]+$/.test(form.securePath)) {
        push(errors, 'securePath', 'Only letters, digits, hyphen and underscore are allowed.');
    }
};

const validatePorts: Validator = (form, errors) => {
    if (form.ports === undefined) return;
    if (form.ports.length === 0) {
        push(errors, 'ports', 'Select at least one port.');
    }
    for (const port of form.ports) {
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            push(errors, 'ports', `Invalid port: ${port}`);
        }
    }
};

const validateProtocols: Validator = (form, errors) => {
    if (form.protocols !== undefined && form.protocols.trim() === '') {
        push(errors, 'protocols', 'Enable at least one protocol.');
    }
};

const validateRemoteDNS: Validator = (form, errors) => {
    if (form.remoteDNS === undefined) return;
    if (!isValidUrl(form.remoteDNS)) {
        push(errors, 'remoteDNS', 'Must be a valid DoH URL.');
        return;
    }
    if (!form.remoteDNS.startsWith('https://')) {
        push(errors, 'remoteDNS', 'DoH URL must use HTTPS.');
    }
};

const validateLocalDNS: Validator = (form, errors) => {
    if (form.localDNS === undefined) return;
    if (!isIPv4(form.localDNS) && form.localDNS !== 'localhost') {
        push(errors, 'localDNS', 'Must be a valid IPv4 address.');
    }
};

const validateProxyIPs: Validator = (form, errors) => {
    if (!form.proxyIPs) return;
    for (const entry of form.proxyIPs) {
        const { host } = parseHostPort(entry);
        if (!isHostLike(host)) push(errors, 'proxyIPs', `Invalid Proxy IP: ${entry}`);
    }
};

const validateNAT64: Validator = (form, errors) => {
    if (!form.nat64Prefixes) return;
    for (const prefix of form.nat64Prefixes) {
        if (!isIPv6(prefix)) push(errors, 'nat64Prefixes', `Invalid NAT64 prefix: ${prefix}`);
    }
};

const validateCleanIPs: Validator = (form, errors) => {
    if (!form.cleanIPs) return;
    for (const entry of form.cleanIPs) {
        if (!isHostLike(entry)) push(errors, 'cleanIPs', `Invalid clean IP or domain: ${entry}`);
    }
};

const validateCustomDomain: Validator = (form, errors) => {
    if (form.customDomain !== undefined && form.customDomain && !isDomain(form.customDomain)) {
        push(errors, 'customDomain', 'Must be a valid domain name.');
    }
};

const validateFallback: Validator = (form, errors) => {
    if (form.fallback !== undefined && form.fallback && !isValidUrl(form.fallback)) {
        push(errors, 'fallback', 'Must be a valid URL, e.g. https://example.com');
    }
};

const validateMaxConfigs: Validator = (form, errors) => {
    if (form.maxConfigs === undefined) return;
    if (!Number.isInteger(form.maxConfigs) || form.maxConfigs < 1 || form.maxConfigs > 200) {
        push(errors, 'maxConfigs', 'Must be between 1 and 200.');
    }
};

const validateNameTemplate: Validator = (form, errors) => {
    if (form.nameTemplate !== undefined && form.nameTemplate.trim() === '') {
        push(errors, 'nameTemplate', 'Template cannot be empty.');
    }
};

const validateEch: Validator = (form, errors) => {
    if (form.enableECH && form.echServerName !== undefined && !isDomain(form.echServerName)) {
        push(errors, 'echServerName', 'Must be a valid domain name.');
    }
};

const validateRules: Validator = (form, errors) => {
    const check = (field: keyof Settings, list?: string[]) => {
        if (!list) return;
        for (const rule of list) {
            const clean = rule.replace(/^(domain|geosite|geoip|ip):/i, '');
            if (!isHostLike(clean) && !/^[a-z-]+$/i.test(clean)) {
                push(errors, field, `Invalid rule: ${rule}`);
            }
        }
    };
    check('customBypassRules', form.customBypassRules);
    check('customBlockRules', form.customBlockRules);
};

const VALIDATORS: Validator[] = [
    validateUUID,
    validateTrojanPassword,
    validateSecurePath,
    validatePorts,
    validateProtocols,
    validateRemoteDNS,
    validateLocalDNS,
    validateProxyIPs,
    validateNAT64,
    validateCleanIPs,
    validateCustomDomain,
    validateFallback,
    validateMaxConfigs,
    validateNameTemplate,
    validateEch,
    validateRules,
];

export function validateSettings(form: Partial<Settings>): ValidationError[] | null {
    const errors: ValidationError[] = [];
    for (const validate of VALIDATORS) validate(form, errors);
    return errors.length ? errors : null;
}
