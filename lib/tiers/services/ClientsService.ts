import type { ClientDTO } from '../models/ClientDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class ClientsService {
    public static getClientById(id: string): CancelablePromise<ClientDTO> {
        return __request(OpenAPI, { method: 'GET', url: '/api/clients/{id}', path: { 'id': id }, errors: { 404: `Client non trouvé` } });
    }
    public static updateClient(id: string, requestBody: ClientDTO): CancelablePromise<ClientDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/clients/{id}', path: { 'id': id }, body: requestBody, mediaType: 'application/json', errors: { 404: `Client non trouvé` } });
    }
    public static deleteClient(id: string): CancelablePromise<any> {
        return __request(OpenAPI, { method: 'DELETE', url: '/api/clients/{id}', path: { 'id': id }, errors: { 404: `Client non trouvé` } });
    }
    public static deactivateClient(id: string): CancelablePromise<ClientDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/clients/{id}/deactivate', path: { 'id': id } });
    }
    public static activateClient(id: string): CancelablePromise<ClientDTO> {
        return __request(OpenAPI, { method: 'PUT', url: '/api/clients/{id}/activate', path: { 'id': id } });
    }
    public static getAllClients(): CancelablePromise<Array<ClientDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/clients' });
    }
    public static createClient(requestBody: ClientDTO): CancelablePromise<ClientDTO> {
        return __request(OpenAPI, { method: 'POST', url: '/api/clients', body: requestBody, mediaType: 'application/json', errors: { 400: `Données invalides`, 500: `Erreur interne du serveur` } });
    }
    public static getInactiveClients(): CancelablePromise<Array<ClientDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/clients/inactive' });
    }
    public static getActiveClients(): CancelablePromise<Array<ClientDTO>> {
        return __request(OpenAPI, { method: 'GET', url: '/api/clients/active' });
    }
}
