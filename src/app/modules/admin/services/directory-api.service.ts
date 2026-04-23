import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type {
  CreateEstablishmentRequest,
  CreateEstablishmentSeriesRequest,
  CreateUserRequest,
  EstablishmentOptionDto,
  EstablishmentDocumentTypeOptionDto,
  EstablishmentSeriesItemDto,
  PermissionMenuNodeDto,
  UbigeoDepartmentDto,
  UbigeoDistrictDto,
  UbigeoProvinceDto,
  UpdateEstablishmentRequest,
  UpdateUserRequest,
  UserListItemDto,
} from '../models/directory.models';

@Injectable({ providedIn: 'root' })
export class DirectoryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listUsers() {
    return this.http.get<UserListItemDto[]>(`${this.base}/users`);
  }

  createUser(body: CreateUserRequest) {
    return this.http.post<UserListItemDto>(`${this.base}/users`, body);
  }

  updateUser(id: string, body: UpdateUserRequest) {
    return this.http.patch<UserListItemDto>(`${this.base}/users/${id}`, body);
  }

  deleteUser(id: string) {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }

  listEstablishments() {
    return this.http.get<EstablishmentOptionDto[]>(`${this.base}/establishments`);
  }

  createEstablishment(body: CreateEstablishmentRequest) {
    return this.http.post<EstablishmentOptionDto>(`${this.base}/establishments`, body);
  }

  updateEstablishment(id: string, body: UpdateEstablishmentRequest) {
    return this.http.patch<EstablishmentOptionDto>(`${this.base}/establishments/${id}`, body);
  }

  deleteEstablishment(id: string) {
    return this.http.delete<void>(`${this.base}/establishments/${id}`);
  }

  listEstablishmentSeries(establishmentId: string) {
    return this.http.get<EstablishmentSeriesItemDto[]>(
      `${this.base}/establishments/${establishmentId}/series`,
    );
  }

  createEstablishmentSeries(
    establishmentId: string,
    body: CreateEstablishmentSeriesRequest,
  ) {
    return this.http.post<EstablishmentSeriesItemDto>(
      `${this.base}/establishments/${establishmentId}/series`,
      body,
    );
  }

  deleteEstablishmentSeries(establishmentId: string, seriesId: string) {
    return this.http.delete<void>(
      `${this.base}/establishments/${establishmentId}/series/${seriesId}`,
    );
  }

  listEstablishmentDocumentTypes() {
    return this.http.get<EstablishmentDocumentTypeOptionDto[]>(
      `${this.base}/establishments/series/document-types`,
    );
  }

  listUbigeoDepartments() {
    return this.http.get<UbigeoDepartmentDto[]>(
      `${this.base}/establishments/ubigeo/departments`,
    );
  }

  listUbigeoProvinces(departmentId: string) {
    return this.http.get<UbigeoProvinceDto[]>(
      `${this.base}/establishments/ubigeo/provinces/${departmentId}`,
    );
  }

  listUbigeoDistricts(provinceId: string) {
    return this.http.get<UbigeoDistrictDto[]>(
      `${this.base}/establishments/ubigeo/districts/${provinceId}`,
    );
  }

  getPermissionMenuTree() {
    return this.http.get<PermissionMenuNodeDto | null>(
      `${this.base}/permissions/menu-tree`,
    );
  }
}
