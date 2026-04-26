import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type {
  CreateCustomerRequest,
  CreateCustomerTypeRequest,
  CreateCategoryRequest,
  CreateBrandRequest,
  CreateProductLocationRequest,
  CustomerCatalogOptionDto,
  CustomerImportResultDto,
  CustomerItemDto,
  CustomerListFiltersRequest,
  CustomerListResponseDto,
  CustomerSellerDto,
  CustomerZoneDto,
  EstablishmentListFiltersRequest,
  CreateEstablishmentRequest,
  CreateEstablishmentSeriesRequest,
  CreateUserRequest,
  CustomerTypeItemDto,
  CustomerTypeListFiltersRequest,
  CategoryItemDto,
  CategoryListFiltersRequest,
  BrandItemDto,
  BrandListFiltersRequest,
  EstablishmentOptionDto,
  EstablishmentDocumentTypeOptionDto,
  EstablishmentSeriesItemDto,
  ExportCustomersRequest,
  CreateProductRequest,
  PermissionMenuNodeDto,
  ProductCatalogAttributeTypeDto,
  ProductCatalogCurrencyDto,
  ProductCatalogLocationDto,
  ProductCatalogTaxAffectationDto,
  ProductCatalogUnitDto,
  ProductCatalogWarehouseDto,
  ProductListFiltersRequest,
  ProductListItemDto,
  ProductListResponseDto,
  UbigeoDepartmentDto,
  UbigeoDistrictDto,
  UbigeoProvinceDto,
  UserListFiltersRequest,
  UpdateEstablishmentRequest,
  UpdateCustomerRequest,
  UpdateCustomerTypeRequest,
  UpdateCategoryRequest,
  UpdateBrandRequest,
  UpdateUserRequest,
  UserListItemDto,
} from '../models/directory.models';

@Injectable({ providedIn: 'root' })
export class DirectoryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listUsers(filters?: UserListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.role && filters.role !== 'all') params['role'] = filters.role;
    return this.http.get<UserListItemDto[]>(`${this.base}/users`, { params });
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

  listEstablishments(filters?: EstablishmentListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.hospital && filters.hospital !== 'all') params['hospital'] = filters.hospital;
    return this.http.get<EstablishmentOptionDto[]>(`${this.base}/establishments`, { params });
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

  listCustomerTypes(filters?: CustomerTypeListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<CustomerTypeItemDto[]>(`${this.base}/customer-types`, { params });
  }

  createCustomerType(body: CreateCustomerTypeRequest) {
    return this.http.post<CustomerTypeItemDto>(`${this.base}/customer-types`, body);
  }

  updateCustomerType(id: string, body: UpdateCustomerTypeRequest) {
    return this.http.patch<CustomerTypeItemDto>(`${this.base}/customer-types/${id}`, body);
  }

  deleteCustomerType(id: string) {
    return this.http.delete<void>(`${this.base}/customer-types/${id}`);
  }

  listCategories(filters?: CategoryListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<CategoryItemDto[]>(`${this.base}/categories`, { params });
  }

  createCategory(body: CreateCategoryRequest) {
    return this.http.post<CategoryItemDto>(`${this.base}/categories`, body);
  }

  updateCategory(id: string, body: UpdateCategoryRequest) {
    return this.http.patch<CategoryItemDto>(`${this.base}/categories/${id}`, body);
  }

  deleteCategory(id: string) {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  listBrands(filters?: BrandListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<BrandItemDto[]>(`${this.base}/brands`, { params });
  }

  createBrand(body: CreateBrandRequest) {
    return this.http.post<BrandItemDto>(`${this.base}/brands`, body);
  }

  updateBrand(id: string, body: UpdateBrandRequest) {
    return this.http.patch<BrandItemDto>(`${this.base}/brands/${id}`, body);
  }

  deleteBrand(id: string) {
    return this.http.delete<void>(`${this.base}/brands/${id}`);
  }

  listCustomers(filters?: CustomerListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.customerTypeId) params['customerTypeId'] = filters.customerTypeId;
    if (filters?.zoneId) params['zoneId'] = filters.zoneId;
    if (filters?.estado && filters.estado !== 'all') params['estado'] = filters.estado;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<CustomerListResponseDto>(`${this.base}/customers`, { params });
  }

  getCustomer(id: string) {
    return this.http.get<CustomerItemDto>(`${this.base}/customers/${id}`);
  }

  createCustomer(body: CreateCustomerRequest) {
    return this.http.post<CustomerItemDto>(`${this.base}/customers`, body);
  }

  updateCustomer(id: string, body: UpdateCustomerRequest) {
    return this.http.patch<CustomerItemDto>(`${this.base}/customers/${id}`, body);
  }

  deleteCustomer(id: string) {
    return this.http.delete<void>(`${this.base}/customers/${id}`);
  }

  updateCustomerStatus(id: string, habilitado: boolean) {
    return this.http.patch<CustomerItemDto>(`${this.base}/customers/${id}/status`, { habilitado });
  }

  updateCustomerBarcode(id: string, codigoBarra: string) {
    return this.http.patch<CustomerItemDto>(`${this.base}/customers/${id}/barcode`, { codigoBarra });
  }

  updateCustomerTags(id: string, etiquetas: string[]) {
    return this.http.patch<CustomerItemDto>(`${this.base}/customers/${id}/tags`, { etiquetas });
  }

  listCustomerZones() {
    return this.http.get<CustomerZoneDto[]>(`${this.base}/customers/zones`);
  }

  createCustomerZone(nombre: string) {
    return this.http.post<CustomerZoneDto>(`${this.base}/customers/zones`, { nombre });
  }

  listCustomerSellers() {
    return this.http.get<CustomerSellerDto[]>(`${this.base}/customers/catalogs/sellers`);
  }

  listCustomerDocumentTypes() {
    return this.http.get<CustomerCatalogOptionDto[]>(`${this.base}/customers/catalogs/document-types`);
  }

  listCustomerNationalities() {
    return this.http.get<CustomerCatalogOptionDto[]>(`${this.base}/customers/catalogs/nationalities`);
  }

  downloadCustomerImportTemplate() {
    return this.http.get(`${this.base}/customers/import/template`, {
      responseType: 'blob',
    });
  }

  importCustomers(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<CustomerImportResultDto>(`${this.base}/customers/import`, body);
  }

  exportCustomers(body: ExportCustomersRequest) {
    return this.http.post(`${this.base}/customers/export`, body, {
      responseType: 'blob',
    });
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

  listProductCatalogUnits() {
    return this.http.get<ProductCatalogUnitDto[]>(`${this.base}/products/catalogs/units`);
  }

  listProductCatalogCurrencies() {
    return this.http.get<ProductCatalogCurrencyDto[]>(`${this.base}/products/catalogs/currencies`);
  }

  listProductCatalogTaxAffectationTypes() {
    return this.http.get<ProductCatalogTaxAffectationDto[]>(
      `${this.base}/products/catalogs/tax-affectation-types`,
    );
  }

  listProductCatalogWarehouses() {
    return this.http.get<ProductCatalogWarehouseDto[]>(`${this.base}/products/catalogs/warehouses`);
  }

  listProductCatalogLocations() {
    return this.http.get<ProductCatalogLocationDto[]>(`${this.base}/products/catalogs/product-locations`);
  }

  createProductLocation(body: CreateProductLocationRequest) {
    return this.http.post<ProductCatalogLocationDto>(`${this.base}/products/catalogs/product-locations`, body);
  }

  listProductCatalogAttributeTypes() {
    return this.http.get<ProductCatalogAttributeTypeDto[]>(
      `${this.base}/products/catalogs/attribute-types`,
    );
  }

  listProducts(filters?: ProductListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<ProductListResponseDto>(`${this.base}/products`, { params });
  }

  createProduct(body: CreateProductRequest) {
    return this.http.post<ProductListItemDto>(`${this.base}/products`, body);
  }
}
