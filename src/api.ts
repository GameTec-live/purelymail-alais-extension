import type {
    PurelymailConfig,
    PurelymailApiResponse,
    ListDomainsResponse,
    ListRoutingResponse,
    ListUserResponse,
    CreateRoutingRequest,
    DeleteRoutingRequest
} from './types';

export class PurelymailAPI {
    private config: PurelymailConfig;

    constructor(config: PurelymailConfig) {
        this.config = config;
    }
    private async makeRequest<T>(endpoint: string, data: any = {}): Promise<T> {
        console.log(`Making API request to ${endpoint}`, data);

        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Purelymail-Api-Token': this.config.apiToken
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as PurelymailApiResponse<T>;
        console.log(`API response from ${endpoint}:`, result);

        if (result.error) {
            throw new Error(`API Error: ${result.error.code} - ${result.error.message}`);
        }

        // Return the unwrapped result
        return result.result;
    }

    async listDomains(includeShared: boolean = false): Promise<ListDomainsResponse> {
        return this.makeRequest<ListDomainsResponse>('/api/v0/listDomains', { includeShared });
    }

    async listUsers(): Promise<ListUserResponse> {
        return this.makeRequest<ListUserResponse>('/api/v0/listUser', {});
    }

    async listRoutingRules(): Promise<ListRoutingResponse> {
        return this.makeRequest<ListRoutingResponse>('/api/v0/listRoutingRules', {});
    }

    async createRoutingRule(request: CreateRoutingRequest): Promise<void> {
        return this.makeRequest<void>('/api/v0/createRoutingRule', request);
    }

    async deleteRoutingRule(request: DeleteRoutingRequest): Promise<void> {
        return this.makeRequest<void>('/api/v0/deleteRoutingRule', request);
    }
}
