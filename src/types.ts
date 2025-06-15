// API Types for Purelymail
export interface PurelymailConfig {
    apiToken: string;
    baseUrl: string;
}

export interface Domain {
    name: string;
    allowAccountReset: boolean;
    symbolicSubaddressing: boolean;
    isShared: boolean;
    dnsSummary: {
        passesMx: boolean;
        passesSpf: boolean;
        passesDkim: boolean;
        passesDmarc: boolean;
    };
}

export interface User {
    userName: string;
    enableSearchIndexing: boolean;
    recoveryEnabled: boolean;
    requireTwoFactorAuthentication: boolean;
    enableSpamFiltering: boolean;
}

export interface RoutingRule {
    id: number;
    domainName: string;
    prefix: boolean;
    matchUser: string;
    targetAddresses: string[];
    catchall: boolean;
}

// Extension Settings Types
export interface ExtensionSettings {
    defaultAccount: string;
    systemAliases: string[];
    defaultDomain: string;
    hiddenUsers: string[];
    hiddenDomains: string[];
    spamEmail: string;
    customSpamEmail?: string;
    selectedDomains: string[];
    isFirstRun: boolean;
    apiToken?: string;
}

export interface CreatedAlias {
    alias: string;
    targetAddress: string;
    createdAt: string;
    createdFor: string;
}

// API Request/Response Types
export interface CreateRoutingRequest {
    domainName: string;
    prefix: boolean;
    matchUser: string;
    targetAddresses: string[];
    catchall?: boolean;
}

export interface DeleteRoutingRequest {
    routingRuleId: number;
}

export interface ListDomainsRequest {
    includeShared?: boolean;
}

// API Response wrappers (Purelymail API wraps responses in a 'result' property)
export interface PurelymailApiResponse<T> {
    result: T;
    error?: {
        code: string;
        message: string;
    };
}

export interface ListDomainsResponse {
    domains: Domain[];
}

export interface ListRoutingResponse {
    rules: RoutingRule[];
}

export interface ListUserResponse {
    users: string[];
}
