import type { FournisseurDTO } from '../models/FournisseurDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class FournisseursService {
    public static getFournisseurById(id: string): CancelablePromise<FournisseurDTO> {
        return __request(OpenAPI, { method: 'GET', url: '/api/fournisseurs/{id}', path: { 'id': id } });
    }
    public static updateFournisseur(id: string, requestBody: FournisseurDTO): CancelablePromise<FournisseurDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/fournisseurs/{id}', path: { 'id': id }, body: requestBody, mediaType: 'application/json' });
    }
    public static deleteFournisseur(id: string): CancelablePromise<any> {
        return __request(OpenAPI, { method: 'DELETE', url: '/api/fournisseurs/{id}', path: { 'id': id } });
    }
    public static getAllFournisseurs(): CancelablePromise<Array<FournisseurDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/fournisseurs' });
    }
    public static defineAccountingAccount(id: string, accountingAccount: string): CancelablePromise<FournisseurDTO> {
        return __request(OpenAPI, { method: 'PATCH', url: '/api/fournisseurs/{id}/accounting-account', path: { 'id': id }, body: accountingAccount, mediaType: 'text/plain' });
    }
    public static createFournisseur(requestBody: FournisseurDTO): CancelablePromise<FournisseurDTO> {
        return __request(OpenAPI, { method: 'POST', url: '/api/fournisseurs', body: requestBody, mediaType: 'application/json' });
    }
    public static deactivateFournisseur(id: string): CancelablePromise<FournisseurDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/fournisseurs/{id}/deactivate', path: { 'id': id } });
    }
    public static activateFournisseur(id: string): CancelablePromise<FournisseurDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/fournisseurs/{id}/activate', path: { 'id': id } });
    }
}
