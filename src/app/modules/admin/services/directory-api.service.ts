import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type {
  CreateUserRequest,
  EstablishmentOptionDto,
  PermissionMenuNodeDto,
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

  getPermissionMenuTree() {
    return this.http.get<PermissionMenuNodeDto | null>(
      `${this.base}/permissions/menu-tree`,
    );
  }
}
