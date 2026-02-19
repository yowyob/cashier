import type { CommercialDTO } from '../models/CommercialDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class CommerciauxService {
    public static getCommercialById(id: string): CancelablePromise<CommercialDTO> {
        return __request(OpenAPI, { method: 'GET', url: '/api/commerciaux/{id}', path: { 'id': id } });
    }
    public static updateCommercial(id: string, requestBody: CommercialDTO): CancelablePromise<CommercialDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/commerciaux/{id}', path: { 'id': id }, body: requestBody, mediaType: 'application/json' });
    }
    public static deleteCommercial(id: string): CancelablePromise<any> {
        return __request(OpenAPI, { method: 'DELETE', url: '/api/commerciaux/{id}', path: { 'id': id } });
    }
    public static getAllCommerciaux(): CancelablePromise<Array<CommercialDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/commerciaux' });
    }
    public static createCommercial(requestBody: CommercialDTO): CancelablePromise<CommercialDTO> {
        return __request(OpenAPI, { method: 'POST', url: '/api/commerciaux', body: requestBody, mediaType: 'application/json' });
    }
}
