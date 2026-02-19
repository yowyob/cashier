import type { TiersBaseDTO } from '../models/TiersBaseDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class TiersService {
    public static getAllTiers(): CancelablePromise<Array<TiersBaseDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/tiers' });
    }
    public static getTiersById(id: string): CancelablePromise<TiersBaseDTO> {
        return __request(OpenAPI, { method: 'GET', url: '/api/tiers/{id}', path: { 'id': id } });
    }
    public static deleteTiers(id: string): CancelablePromise<any> {
        return __request(OpenAPI, { method: 'DELETE', url: '/api/tiers/{id}', path: { 'id': id } });
    }
    public static deactivateTiers(id: string): CancelablePromise<TiersBaseDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/tiers/{id}/deactivate', path: { 'id': id } });
    }
    public static activateTiers(id: string): CancelablePromise<TiersBaseDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/tiers/{id}/activate', path: { 'id': id } });
    }
    public static getActiveTiers(): CancelablePromise<Array<TiersBaseDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/tiers/active' });
    }
    public static getInactiveTiers(): CancelablePromise<Array<TiersBaseDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/tiers/inactive' });
    }
    public static getTiersByAgency(agencyId: string): CancelablePromise<Array<TiersBaseDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/tiers/agency/{agencyId}', path: { 'agencyId': agencyId } });
    }
}
