import type { ProspectDTO } from '../models/ProspectDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class ProspectsService {
    public static getProspectById(id: string): CancelablePromise<ProspectDTO> {
        return __request(OpenAPI, { method: 'GET', url: '/api/prospects/{id}', path: { 'id': id } });
    }
    public static updateProspect(id: string, requestBody: ProspectDTO): CancelablePromise<ProspectDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/prospects/{id}', path: { 'id': id }, body: requestBody, mediaType: 'application/json' });
    }
    public static deleteProspect(id: string): CancelablePromise<any> {
        return __request(OpenAPI, { method: 'DELETE', url: '/api/prospects/{id}', path: { 'id': id } });
    }
    public static getAllProspects(): CancelablePromise<Array<ProspectDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/prospects' });
    }
    public static defineAccountingAccount(id: string, accountingAccount: string): CancelablePromise<ProspectDTO> {
        return __request(OpenAPI, { method: 'PATCH', url: '/api/prospects/{id}/accounting-account', path: { 'id': id }, body: accountingAccount, mediaType: 'text/plain' });
    }
    public static createProspect(requestBody: ProspectDTO): CancelablePromise<ProspectDTO> {
        return __request(OpenAPI, { method: 'POST', url: '/api/prospects', body: requestBody, mediaType: 'application/json' });
    }
}
