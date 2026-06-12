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
  CustomerTypeListResponseDto,
  CategoryItemDto,
  CategoryListFiltersRequest,
  CategoryListResponseDto,
  CategoryTreeNodeDto,
  BrandItemDto,
  BrandListFiltersRequest,
  BrandListResponseDto,
  LaboratoryItemDto,
  LaboratoryListFiltersRequest,
  LaboratoryListResponseDto,
  CreateLaboratoryRequest,
  UpdateLaboratoryRequest,
  UnitItemDto,
  UnitListFiltersRequest,
  UnitListResponseDto,
  CreateUnitRequest,
  UpdateUnitRequest,
  PharmaceuticalFormItemDto,
  PharmaceuticalFormListFiltersRequest,
  PharmaceuticalFormListResponseDto,
  CreatePharmaceuticalFormRequest,
  UpdatePharmaceuticalFormRequest,
  ActivePrincipleItemDto,
  ActivePrincipleListFiltersRequest,
  ActivePrincipleListResponseDto,
  CreateActivePrincipleRequest,
  UpdateActivePrincipleRequest,
  AdministrationRouteItemDto,
  AdministrationRouteListFiltersRequest,
  AdministrationRouteListResponseDto,
  CreateAdministrationRouteRequest,
  UpdateAdministrationRouteRequest,
  ProductEquivalentItemDto,
  SupplierPurchaseHistoryResponseDto,
  SupplierItemDto,
  SupplierOptionDto,
  SupplierListFiltersRequest,
  SupplierListResponseDto,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierProductItemDto,
  UpsertSupplierProductRequest,
  EstablishmentOptionDto,
  EstablishmentDocumentTypeOptionDto,
  EstablishmentSeriesItemDto,
  ExportCustomersRequest,
  CreateProductRequest,
  PermissionMenuNodeDto,
  ProductCatalogAttributeTypeDto,
  ProductCatalogCurrencyDto,
  ProductCatalogIscSystemDto,
  ProductCatalogLocationDto,
  ProductCatalogTaxAffectationDto,
  ProductCatalogUnitDto,
  ProductCatalogWarehouseDto,
  ProductImportMode,
  InventoryCreateInboundRequest,
  InventoryCreateOutboundRequest,
  ProductHistoryStockItemDto,
  ProductPriceHistoryListResponseDto,
  ProductStockSummaryDto,
  ProductImportResultDto,
  ProductListFiltersRequest,
  ProductListItemDto,
  ProductDetailDto,
  ProductListResponseDto,
  ProductSupplierLinkDto,
  UpsertProductSupplierRequest,
  ServiceCatalogAttributeTypeDto,
  ServiceCatalogCurrencyDto,
  ServiceCatalogIscSystemDto,
  ServiceCatalogLocationDto,
  ServiceCatalogTaxAffectationDto,
  ServiceCatalogUnitDto,
  CompoundProductCatalogPlatformDto,
  CompoundProductDetailDto,
  CompoundProductImportMode,
  CompoundProductListFiltersRequest,
  CompoundProductListResponseDto,
  CreateCompoundProductRequest,
  CreateServiceRequest,
  ServiceHistoryStockItemDto,
  InventoryImportMode,
  InventoryMovementListFiltersRequest,
  InventoryMovementListResponseDto,
  InventoryWarehouseOptionDto,
  InventoryTransferReasonOptionDto,
  InventoryLotCodeOptionDto,
  InventoryLotSearchMode,
  ServiceListFiltersRequest,
  ServiceListItemDto,
  ServiceListResponseDto,
  SeriesListFiltersRequest,
  SeriesListItemDto,
  SeriesListResponseDto,
  UbigeoDepartmentDto,
  UbigeoDistrictDto,
  UbigeoProvinceDto,
  UserListFiltersRequest,
  UpdateEstablishmentRequest,
  UpdateCustomerRequest,
  UpdateCustomerTypeRequest,
  UpdateCategoryRequest,
  UpdateBrandRequest,
  UpdateUserPermissionsRequest,
  UpdateUserRequest,
  UserListItemDto,
  UserListResponseDto,
  DashboardStatsDto,
  EstablishmentListResponseDto,
  InventoryLotListFiltersRequest,
  InventoryLotListResponseDto,
  KardexFiltersRequest,
  KardexListResponseDto,
  InventoryTransferListFiltersRequest,
  InventoryTransferListResponseDto,
  CreateInventoryTransferRequest,
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentResultDto,
  InventoryPendingAdjustmentDto,
  InventoryValuationFiltersRequest,
  InventoryValuationReportResponseDto,
  InventoryPhysicalCountListItemDto,
  InventoryPhysicalCountDetailDto,
  CreatePhysicalCountRequest,
  UpsertPhysicalCountItemRequest,
  WarehouseZoneDto,
  CreateWarehouseZoneRequest,
  ColdChainTemperatureLogDto,
  CreateTemperatureLogRequest,
  PaginatedResponseDto,
  SaleLotAllocationPreviewRequest,
  SaleLotAllocationPreviewDto,
  DispatchSaleStockRequest,
  PosCatalogItemDto,
  SaleInteractionsCheckDto,
  SaleListItemDto,
  SaleDetailDto,
  CreateSaleRequest,
  SaleListFiltersRequest,
  CashRegisterDto,
  CashActiveSessionDto,
  OpenCashSessionRequest,
  CloseCashSessionRequest,
  CashMovementRequest,
  CashSessionSummaryDto,
  QuotationListItemDto,
  QuotationDetailDto,
  CreateQuotationRequest,
  PurchaseOrderListItemDto,
  PurchaseOrderDetailDto,
  PurchaseOrderStatus,
  CreatePurchaseOrderRequest,
  CreateGoodsReceiptRequest,
  AccountPayableListItemDto,
  ReplenishmentSuggestionDto,
  PriceComparisonItemDto,
  BillingConfigDto,
  UpsertBillingConfigRequest,
  ValidateRucResponseDto,
  EmitSpecialDocumentRequest,
  ElectronicDocumentListItemDto,
  ElectronicDocumentDetailDto,
  SunatDocumentStatus,
  SaleBillingStatusDto,
  CreateSaleReturnRequest,
  SaleReturnResponseDto,
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
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<UserListResponseDto>(`${this.base}/users`, { params });
  }

  createUser(body: CreateUserRequest) {
    return this.http.post<UserListItemDto>(`${this.base}/users`, body);
  }

  updateUser(id: string, body: UpdateUserRequest) {
    return this.http.patch<UserListItemDto>(`${this.base}/users/${id}`, body);
  }

  updateUserPermissions(id: string, body: UpdateUserPermissionsRequest) {
    return this.http.patch<UserListItemDto>(`${this.base}/users/${id}/permissions`, body);
  }

  deleteUser(id: string) {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }

  getDashboardStats() {
    return this.http.get<DashboardStatsDto>(`${this.base}/dashboard/stats`);
  }

  listEstablishmentsAll(filters?: Omit<EstablishmentListFiltersRequest, 'page' | 'pageSize'>) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.hospital && filters.hospital !== 'all') params['hospital'] = filters.hospital;
    return this.http.get<EstablishmentOptionDto[]>(`${this.base}/establishments`, { params });
  }

  listEstablishmentsPaged(filters?: EstablishmentListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.hospital && filters.hospital !== 'all') params['hospital'] = filters.hospital;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<EstablishmentListResponseDto>(`${this.base}/establishments`, { params });
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

  listCustomerTypesAll(
    filters?: Omit<CustomerTypeListFiltersRequest, 'page' | 'pageSize'>,
  ) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<CustomerTypeItemDto[]>(`${this.base}/customer-types`, { params });
  }

  listCustomerTypesPaged(filters?: CustomerTypeListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<CustomerTypeListResponseDto>(`${this.base}/customer-types`, { params });
  }

  /** Sin paginación (combos y catálogos). */
  listCustomerTypes(filters?: Omit<CustomerTypeListFiltersRequest, 'page' | 'pageSize'>) {
    return this.listCustomerTypesAll(filters);
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

  listCategoriesAll(filters?: Omit<CategoryListFiltersRequest, 'page' | 'pageSize'>) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<CategoryItemDto[]>(`${this.base}/categories`, { params });
  }

  listCategoriesPaged(filters?: CategoryListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<CategoryListResponseDto>(`${this.base}/categories`, { params });
  }

  /** Sin paginación (combos y catálogos). */
  listCategories(filters?: Omit<CategoryListFiltersRequest, 'page' | 'pageSize'>) {
    return this.listCategoriesAll(filters);
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

  listCategoryTree() {
    return this.http.get<CategoryTreeNodeDto[]>(`${this.base}/categories/tree`);
  }

  listBrandsAll(filters?: Omit<BrandListFiltersRequest, 'page' | 'pageSize'>) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<BrandItemDto[]>(`${this.base}/brands`, { params });
  }

  listBrandsPaged(filters?: BrandListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<BrandListResponseDto>(`${this.base}/brands`, { params });
  }

  /** Sin paginación (combos y catálogos). */
  listBrands(filters?: Omit<BrandListFiltersRequest, 'page' | 'pageSize'>) {
    return this.listBrandsAll(filters);
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

  listLaboratoriesAll(filters?: Omit<LaboratoryListFiltersRequest, 'page' | 'pageSize'>) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<LaboratoryItemDto[]>(`${this.base}/laboratories`, { params });
  }

  listLaboratoriesPaged(filters?: LaboratoryListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<LaboratoryListResponseDto>(`${this.base}/laboratories`, { params });
  }

  listLaboratories(filters?: Omit<LaboratoryListFiltersRequest, 'page' | 'pageSize'>) {
    return this.listLaboratoriesAll(filters);
  }

  createLaboratory(body: CreateLaboratoryRequest) {
    return this.http.post<LaboratoryItemDto>(`${this.base}/laboratories`, body);
  }

  updateLaboratory(id: string, body: UpdateLaboratoryRequest) {
    return this.http.patch<LaboratoryItemDto>(`${this.base}/laboratories/${id}`, body);
  }

  deleteLaboratory(id: string) {
    return this.http.delete<void>(`${this.base}/laboratories/${id}`);
  }

  listUnitsAll(filters?: Omit<UnitListFiltersRequest, 'page' | 'pageSize'>) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<UnitItemDto[]>(`${this.base}/units`, { params });
  }

  listUnitsPaged(filters?: UnitListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<UnitListResponseDto>(`${this.base}/units`, { params });
  }

  listUnits(filters?: Omit<UnitListFiltersRequest, 'page' | 'pageSize'>) {
    return this.listUnitsAll(filters);
  }

  createUnit(body: CreateUnitRequest) {
    return this.http.post<UnitItemDto>(`${this.base}/units`, body);
  }

  updateUnit(id: string, body: UpdateUnitRequest) {
    return this.http.patch<UnitItemDto>(`${this.base}/units/${id}`, body);
  }

  deleteUnit(id: string) {
    return this.http.delete<void>(`${this.base}/units/${id}`);
  }

  listPharmaceuticalFormsAll(
    filters?: Omit<PharmaceuticalFormListFiltersRequest, 'page' | 'pageSize'>,
  ) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<PharmaceuticalFormItemDto[]>(`${this.base}/pharmaceutical-forms`, { params });
  }

  listPharmaceuticalFormsPaged(filters?: PharmaceuticalFormListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<PharmaceuticalFormListResponseDto>(`${this.base}/pharmaceutical-forms`, {
      params,
    });
  }

  listPharmaceuticalForms(
    filters?: Omit<PharmaceuticalFormListFiltersRequest, 'page' | 'pageSize'>,
  ) {
    return this.listPharmaceuticalFormsAll(filters);
  }

  createPharmaceuticalForm(body: CreatePharmaceuticalFormRequest) {
    return this.http.post<PharmaceuticalFormItemDto>(`${this.base}/pharmaceutical-forms`, body);
  }

  updatePharmaceuticalForm(id: string, body: UpdatePharmaceuticalFormRequest) {
    return this.http.patch<PharmaceuticalFormItemDto>(
      `${this.base}/pharmaceutical-forms/${id}`,
      body,
    );
  }

  deletePharmaceuticalForm(id: string) {
    return this.http.delete<void>(`${this.base}/pharmaceutical-forms/${id}`);
  }

  listActivePrinciplesAll(
    filters?: Omit<ActivePrincipleListFiltersRequest, 'page' | 'pageSize'>,
  ) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<ActivePrincipleItemDto[]>(`${this.base}/active-principles`, { params });
  }

  listActivePrinciplesPaged(filters?: ActivePrincipleListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<ActivePrincipleListResponseDto>(`${this.base}/active-principles`, {
      params,
    });
  }

  listActivePrinciples(filters?: Omit<ActivePrincipleListFiltersRequest, 'page' | 'pageSize'>) {
    return this.listActivePrinciplesAll(filters);
  }

  createActivePrinciple(body: CreateActivePrincipleRequest) {
    return this.http.post<ActivePrincipleItemDto>(`${this.base}/active-principles`, body);
  }

  updateActivePrinciple(id: string, body: UpdateActivePrincipleRequest) {
    return this.http.patch<ActivePrincipleItemDto>(`${this.base}/active-principles/${id}`, body);
  }

  deleteActivePrinciple(id: string) {
    return this.http.delete<void>(`${this.base}/active-principles/${id}`);
  }

  listAdministrationRoutesAll(
    filters?: Omit<AdministrationRouteListFiltersRequest, 'page' | 'pageSize'>,
  ) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get<AdministrationRouteItemDto[]>(`${this.base}/administration-routes`, {
      params,
    });
  }

  listAdministrationRoutesPaged(filters?: AdministrationRouteListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<AdministrationRouteListResponseDto>(`${this.base}/administration-routes`, {
      params,
    });
  }

  createAdministrationRoute(body: CreateAdministrationRouteRequest) {
    return this.http.post<AdministrationRouteItemDto>(`${this.base}/administration-routes`, body);
  }

  updateAdministrationRoute(id: string, body: UpdateAdministrationRouteRequest) {
    return this.http.patch<AdministrationRouteItemDto>(
      `${this.base}/administration-routes/${id}`,
      body,
    );
  }

  deleteAdministrationRoute(id: string) {
    return this.http.delete<void>(`${this.base}/administration-routes/${id}`);
  }

  listSuppliersPaged(filters?: SupplierListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<SupplierListResponseDto>(`${this.base}/suppliers`, { params });
  }

  listSupplierOptions() {
    return this.http.get<SupplierOptionDto[]>(`${this.base}/suppliers/options`);
  }

  getSupplier(id: string) {
    return this.http.get<SupplierItemDto>(`${this.base}/suppliers/${id}`);
  }

  createSupplier(body: CreateSupplierRequest) {
    return this.http.post<SupplierItemDto>(`${this.base}/suppliers`, body);
  }

  updateSupplier(id: string, body: UpdateSupplierRequest) {
    return this.http.patch<SupplierItemDto>(`${this.base}/suppliers/${id}`, body);
  }

  deleteSupplier(id: string) {
    return this.http.delete<void>(`${this.base}/suppliers/${id}`);
  }

  listSupplierProducts(supplierId: string) {
    return this.http.get<SupplierProductItemDto[]>(`${this.base}/suppliers/${supplierId}/products`);
  }

  upsertSupplierProduct(supplierId: string, body: UpsertSupplierProductRequest) {
    return this.http.post<SupplierProductItemDto>(
      `${this.base}/suppliers/${supplierId}/products`,
      body,
    );
  }

  removeSupplierProduct(supplierId: string, productId: string) {
    return this.http.delete<void>(`${this.base}/suppliers/${supplierId}/products/${productId}`);
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

  updateCustomerZone(id: string, nombre: string) {
    return this.http.patch<CustomerZoneDto>(`${this.base}/customers/zones/${id}`, { nombre });
  }

  deleteCustomerZone(id: string) {
    return this.http.delete<void>(`${this.base}/customers/zones/${id}`);
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

  previewImportCustomers(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<CustomerImportResultDto>(`${this.base}/customers/import/preview`, body);
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

  getPermissionMenuTrees() {
    return this.http.get<PermissionMenuNodeDto[]>(`${this.base}/permissions/menu-trees`);
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

  listProductCatalogLocations(establishmentId?: string) {
    const params: Record<string, string> = {};
    if (establishmentId) params['establishmentId'] = establishmentId;
    return this.http.get<ProductCatalogLocationDto[]>(`${this.base}/products/catalogs/product-locations`, {
      params,
    });
  }

  createProductLocation(body: CreateProductLocationRequest) {
    return this.http.post<ProductCatalogLocationDto>(`${this.base}/products/catalogs/product-locations`, body);
  }

  listProductCatalogAttributeTypes() {
    return this.http.get<ProductCatalogAttributeTypeDto[]>(
      `${this.base}/products/catalogs/attribute-types`,
    );
  }

  listProductCatalogIscSystems() {
    return this.http.get<ProductCatalogIscSystemDto[]>(
      `${this.base}/products/catalogs/isc-systems`,
    );
  }

  listProducts(filters?: ProductListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.categoryId) params['categoryId'] = filters.categoryId;
    if (filters?.brandId) params['brandId'] = filters.brandId;
    if (filters?.habilitado !== undefined) params['habilitado'] = String(filters.habilitado);
    if (filters?.generico !== undefined) params['generico'] = String(filters.generico);
    if (filters?.necesitaRecetaMedica !== undefined) {
      params['necesitaRecetaMedica'] = String(filters.necesitaRecetaMedica);
    }
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<ProductListResponseDto>(`${this.base}/products`, { params });
  }

  listProductSuppliers(productId: string) {
    return this.http.get<ProductSupplierLinkDto[]>(`${this.base}/products/${productId}/suppliers`);
  }

  upsertProductSupplier(productId: string, body: UpsertProductSupplierRequest) {
    return this.http.post<ProductSupplierLinkDto>(`${this.base}/products/${productId}/suppliers`, body);
  }

  removeProductSupplier(productId: string, supplierId: string) {
    return this.http.delete<void>(`${this.base}/products/${productId}/suppliers/${supplierId}`);
  }

  getProduct(id: string) {
    return this.http.get<ProductDetailDto>(`${this.base}/products/${id}`);
  }

  createProduct(body: CreateProductRequest) {
    return this.http.post<ProductDetailDto>(`${this.base}/products`, body);
  }

  updateProduct(id: string, body: CreateProductRequest) {
    return this.http.patch<ProductDetailDto>(`${this.base}/products/${id}`, body);
  }

  deleteProduct(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/products/${id}`);
  }

  duplicateProduct(id: string) {
    return this.http.post<ProductDetailDto>(`${this.base}/products/${id}/duplicate`, {});
  }

  updateProductStatus(id: string, habilitado: boolean) {
    return this.http.patch<ProductListItemDto>(`${this.base}/products/${id}/status`, { habilitado });
  }

  updateProductBarcode(id: string, codigoBarra: string) {
    return this.http.patch<ProductListItemDto>(`${this.base}/products/${id}/barcode`, { codigoBarra });
  }

  listProductHistoryStock(id: string) {
    return this.http.get<ProductHistoryStockItemDto[]>(`${this.base}/products/${id}/history/stock`);
  }

  listProductPriceHistory(id: string, page = 1, pageSize = 20) {
    return this.http.get<ProductPriceHistoryListResponseDto>(
      `${this.base}/products/${id}/history/prices`,
      { params: { page: String(page), pageSize: String(pageSize) } },
    );
  }

  getProductStockSummary(id: string) {
    return this.http.get<ProductStockSummaryDto>(`${this.base}/products/${id}/stock`);
  }

  previewImportProducts(mode: ProductImportMode, file: File) {
    const body = new FormData();
    body.append('mode', mode);
    body.append('file', file);
    return this.http.post<ProductImportResultDto>(`${this.base}/products/import/preview`, body);
  }

  importProducts(mode: ProductImportMode, file: File) {
    const body = new FormData();
    body.append('mode', mode);
    body.append('file', file);
    return this.http.post<ProductImportResultDto>(`${this.base}/products/import`, body);
  }

  exportProducts() {
    return this.http.post(`${this.base}/products/export`, {}, { responseType: 'blob' });
  }

  listProductEquivalents(productId: string) {
    return this.http.get<ProductEquivalentItemDto[]>(
      `${this.base}/products/${productId}/equivalents`,
    );
  }

  setProductEquivalents(productId: string, equivalentProductIds: string[]) {
    return this.http.post<ProductEquivalentItemDto[]>(
      `${this.base}/products/${productId}/equivalents`,
      { equivalentProductIds },
    );
  }

  listSupplierPurchaseHistory(supplierId: string) {
    return this.http.get<SupplierPurchaseHistoryResponseDto>(
      `${this.base}/suppliers/${supplierId}/purchase-history`,
    );
  }

  downloadProductImportTemplate(mode: ProductImportMode) {
    return this.http.get(`${this.base}/products/import/template`, {
      params: { mode },
      responseType: 'blob',
    });
  }

  listServiceCatalogUnits() {
    return this.http.get<ServiceCatalogUnitDto[]>(`${this.base}/services/catalogs/units`);
  }

  listServiceCatalogCurrencies() {
    return this.http.get<ServiceCatalogCurrencyDto[]>(`${this.base}/services/catalogs/currencies`);
  }

  listServiceCatalogTaxAffectationTypes() {
    return this.http.get<ServiceCatalogTaxAffectationDto[]>(
      `${this.base}/services/catalogs/tax-affectation-types`,
    );
  }

  listServiceCatalogLocations() {
    return this.http.get<ServiceCatalogLocationDto[]>(`${this.base}/services/catalogs/product-locations`);
  }

  listServiceCatalogAttributeTypes() {
    return this.http.get<ServiceCatalogAttributeTypeDto[]>(
      `${this.base}/services/catalogs/attribute-types`,
    );
  }

  listServiceCatalogIscSystems() {
    return this.http.get<ServiceCatalogIscSystemDto[]>(
      `${this.base}/services/catalogs/isc-systems`,
    );
  }

  listServices(filters?: ServiceListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<ServiceListResponseDto>(`${this.base}/services`, { params });
  }

  createService(body: CreateServiceRequest) {
    return this.http.post<ServiceListItemDto>(`${this.base}/services`, body);
  }

  updateService(id: string, body: CreateServiceRequest) {
    return this.http.patch<ServiceListItemDto>(`${this.base}/services/${id}`, body);
  }

  deleteService(id: string) {
    return this.http.delete<void>(`${this.base}/services/${id}`);
  }

  duplicateService(id: string) {
    return this.http.post<ServiceListItemDto>(`${this.base}/services/${id}/duplicate`, {});
  }

  updateServiceStatus(id: string, habilitado: boolean) {
    return this.http.patch<ServiceListItemDto>(`${this.base}/services/${id}/status`, { habilitado });
  }

  updateServiceBarcode(id: string, codigoBarra: string) {
    return this.http.patch<ServiceListItemDto>(`${this.base}/services/${id}/barcode`, { codigoBarra });
  }

  listServiceHistoryStock(id: string) {
    return this.http.get<ServiceHistoryStockItemDto[]>(`${this.base}/services/${id}/history/stock`);
  }

  listCompoundProductCatalogUnits() {
    return this.http.get<ProductCatalogUnitDto[]>(`${this.base}/compound-products/catalogs/units`);
  }

  listCompoundProductCatalogCurrencies() {
    return this.http.get<ProductCatalogCurrencyDto[]>(`${this.base}/compound-products/catalogs/currencies`);
  }

  listCompoundProductCatalogTaxAffectationTypes() {
    return this.http.get<ProductCatalogTaxAffectationDto[]>(
      `${this.base}/compound-products/catalogs/tax-affectation-types`,
    );
  }

  listCompoundProductCatalogPlatforms() {
    return this.http.get<CompoundProductCatalogPlatformDto[]>(
      `${this.base}/compound-products/catalogs/platforms`,
    );
  }

  listCompoundProducts(filters?: CompoundProductListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<CompoundProductListResponseDto>(`${this.base}/compound-products`, { params });
  }

  getCompoundProduct(id: string) {
    return this.http.get<CompoundProductDetailDto>(`${this.base}/compound-products/${id}`);
  }

  createCompoundProduct(body: CreateCompoundProductRequest) {
    return this.http.post<CompoundProductDetailDto>(`${this.base}/compound-products`, body);
  }

  updateCompoundProduct(id: string, body: CreateCompoundProductRequest) {
    return this.http.patch<CompoundProductDetailDto>(`${this.base}/compound-products/${id}`, body);
  }

  deleteCompoundProduct(id: string) {
    return this.http.delete<void>(`${this.base}/compound-products/${id}`);
  }

  importCompoundProducts(mode: CompoundProductImportMode, file: File) {
    const body = new FormData();
    body.append('mode', mode);
    body.append('file', file);
    return this.http.post<ProductImportResultDto>(`${this.base}/compound-products/import`, body);
  }

  downloadCompoundProductImportTemplate(mode: CompoundProductImportMode) {
    return this.http.get(`${this.base}/compound-products/import/template`, {
      params: { mode },
      responseType: 'blob',
    });
  }

  listSeries(filters?: SeriesListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<SeriesListResponseDto>(`${this.base}/series`, { params });
  }

  updateSeriesStatus(id: string, estado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'ANULADO', vendido: boolean) {
    return this.http.patch<SeriesListItemDto>(`${this.base}/series/${id}/status`, { estado, vendido });
  }

  deleteSeries(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/series/${id}`);
  }

  exportSeries(filters?: SeriesListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    return this.http.get(`${this.base}/series/export`, {
      params,
      responseType: 'blob',
    });
  }

  listInventoryMovements(filters?: InventoryMovementListFiltersRequest) {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params['search'] = search;
    if (filters?.field && filters.field !== 'all') params['field'] = filters.field;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<InventoryMovementListResponseDto>(`${this.base}/inventory-movements`, { params });
  }

  listInventoryMovementWarehouses() {
    return this.http.get<InventoryWarehouseOptionDto[]>(`${this.base}/inventory-movements/catalogs/warehouses`);
  }

  listInventoryMovementTransferReasons() {
    return this.http.get<InventoryTransferReasonOptionDto[]>(
      `${this.base}/inventory-movements/catalogs/transfer-reasons`,
    );
  }

  listInventoryMovementOutputReasons() {
    return this.http.get<InventoryTransferReasonOptionDto[]>(
      `${this.base}/inventory-movements/catalogs/output-reasons`,
    );
  }

  createInventoryInboundMovement(body: InventoryCreateInboundRequest) {
    return this.http.post<{ ok: boolean; message: string }>(`${this.base}/inventory-movements/inbound`, body);
  }

  createInventoryOutboundMovement(body: InventoryCreateOutboundRequest) {
    return this.http.post<{ ok: boolean; message: string }>(`${this.base}/inventory-movements/outbound`, body);
  }

  searchInventoryLotCodes(params: {
    productId: string;
    warehouseId: string;
    search?: string;
    mode?: InventoryLotSearchMode;
  }) {
    const query: Record<string, string> = {
      productId: params.productId,
      warehouseId: params.warehouseId,
      mode: params.mode ?? 'INBOUND',
    };
    const search = params.search?.trim();
    if (search) query['search'] = search;
    return this.http.get<InventoryLotCodeOptionDto[]>(`${this.base}/inventory-movements/catalogs/lot-codes`, {
      params: query,
    });
  }

  importInventoryLots(warehouseId: string, file: File) {
    const body = new FormData();
    body.append('warehouseId', warehouseId);
    body.append('file', file);
    return this.http.post<ProductImportResultDto>(`${this.base}/inventory-movements/import/lots`, body);
  }

  importInventorySeries(warehouseId: string, file: File) {
    const body = new FormData();
    body.append('warehouseId', warehouseId);
    body.append('file', file);
    return this.http.post<ProductImportResultDto>(`${this.base}/inventory-movements/import/series`, body);
  }

  downloadInventoryImportTemplate(mode: InventoryImportMode) {
    return this.http.get(`${this.base}/inventory-movements/import/template`, {
      params: { mode },
      responseType: 'blob',
    });
  }

  listInventoryLots(filters?: InventoryLotListFiltersRequest) {
    const params: Record<string, string> = {};
    if (filters?.search?.trim()) params['search'] = filters.search.trim();
    if (filters?.field) params['field'] = filters.field;
    if (filters?.warehouseId) params['warehouseId'] = filters.warehouseId;
    if (filters?.establishmentId) params['establishmentId'] = filters.establishmentId;
    if (filters?.categoryId) params['categoryId'] = filters.categoryId;
    if (filters?.expiryFilter) params['expiryFilter'] = filters.expiryFilter;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<InventoryLotListResponseDto>(
      `${this.base}/inventory-movements/lots`,
      { params },
    );
  }

  getInventoryKardex(filters: KardexFiltersRequest) {
    const params: Record<string, string> = { productId: filters.productId };
    if (filters.warehouseId) params['warehouseId'] = filters.warehouseId;
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;
    if (filters.page) params['page'] = String(filters.page);
    if (filters.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<KardexListResponseDto>(
      `${this.base}/inventory-movements/kardex`,
      { params },
    );
  }

  listInventoryTransfers(filters?: InventoryTransferListFiltersRequest) {
    const params: Record<string, string> = {};
    if (filters?.estado) params['estado'] = filters.estado;
    if (filters?.warehouseId) params['warehouseId'] = filters.warehouseId;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<InventoryTransferListResponseDto>(
      `${this.base}/inventory-transfers`,
      { params },
    );
  }

  createInventoryTransfer(body: CreateInventoryTransferRequest) {
    return this.http.post<{ id: string; message: string }>(`${this.base}/inventory-transfers`, body);
  }

  dispatchInventoryTransfer(id: string) {
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.base}/inventory-transfers/${id}/dispatch`,
      {},
    );
  }

  receiveInventoryTransfer(id: string) {
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.base}/inventory-transfers/${id}/receive`,
      {},
    );
  }

  cancelInventoryTransfer(id: string) {
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.base}/inventory-transfers/${id}/cancel`,
      {},
    );
  }

  listColdChainTemperatureLogs(warehouseZoneId: string) {
    return this.http.get<ColdChainTemperatureLogDto[]>(
      `${this.base}/cold-chain/temperature-logs`,
      { params: { warehouseZoneId } },
    );
  }

  createColdChainTemperatureLog(body: CreateTemperatureLogRequest) {
    return this.http.post<ColdChainTemperatureLogDto>(
      `${this.base}/cold-chain/temperature-logs`,
      body,
    );
  }

  createInventoryAdjustment(body: CreateInventoryAdjustmentRequest) {
    return this.http.post<InventoryAdjustmentResultDto>(
      `${this.base}/inventory-movements/adjustments`,
      body,
    );
  }

  listPendingInventoryAdjustments() {
    return this.http.get<InventoryPendingAdjustmentDto[]>(
      `${this.base}/inventory-movements/adjustments/pending`,
    );
  }

  approveInventoryAdjustment(id: string) {
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.base}/inventory-movements/adjustments/${id}/approve`,
      {},
    );
  }

  rejectInventoryAdjustment(id: string) {
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.base}/inventory-movements/adjustments/${id}/reject`,
      {},
    );
  }

  getInventoryValuationReport(filters?: InventoryValuationFiltersRequest) {
    const params: Record<string, string> = {};
    if (filters?.warehouseId) params['warehouseId'] = filters.warehouseId;
    if (filters?.establishmentId) params['establishmentId'] = filters.establishmentId;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    return this.http.get<InventoryValuationReportResponseDto>(
      `${this.base}/inventory-movements/valuation-report`,
      { params },
    );
  }

  listInventoryPhysicalCounts(page = 1, pageSize = 10) {
    return this.http.get<PaginatedResponseDto<InventoryPhysicalCountListItemDto>>(
      `${this.base}/inventory-physical-counts`,
      { params: { page: String(page), pageSize: String(pageSize) } },
    );
  }

  getInventoryPhysicalCount(id: string) {
    return this.http.get<InventoryPhysicalCountDetailDto>(
      `${this.base}/inventory-physical-counts/${id}`,
    );
  }

  createInventoryPhysicalCount(body: CreatePhysicalCountRequest) {
    return this.http.post<{ id: string }>(`${this.base}/inventory-physical-counts`, body);
  }

  upsertInventoryPhysicalCountItem(countId: string, body: UpsertPhysicalCountItemRequest) {
    return this.http.post<{ ok: boolean }>(
      `${this.base}/inventory-physical-counts/${countId}/items`,
      body,
    );
  }

  finalizeInventoryPhysicalCount(countId: string) {
    return this.http.post<{
      ok: boolean;
      finalized?: boolean;
      applied?: number;
      pendingApproval?: number;
      message: string;
    }>(`${this.base}/inventory-physical-counts/${countId}/finalize`, {});
  }

  listWarehouseZones(warehouseId: string) {
    return this.http.get<WarehouseZoneDto[]>(`${this.base}/warehouse-zones`, {
      params: { warehouseId },
    });
  }

  createWarehouseZone(body: CreateWarehouseZoneRequest) {
    return this.http.post<WarehouseZoneDto>(`${this.base}/warehouse-zones`, body);
  }

  listSaleAvailableLots(productId: string, warehouseId: string) {
    return this.http.get<{
      metodoAsignacion: 'FEFO' | 'FIFO';
      blockExpiredProductSales: boolean;
      items: {
        id: string;
        codigoLote: string;
        stock: string;
        fechaVencimiento: string | null;
        vencido: boolean;
      }[];
    }>(`${this.base}/inventory-movements/sales/available-lots`, {
      params: { productId, warehouseId },
    });
  }

  previewSaleLotAllocation(body: SaleLotAllocationPreviewRequest) {
    return this.http.post<SaleLotAllocationPreviewDto>(
      `${this.base}/inventory-movements/sales/allocation-preview`,
      body,
    );
  }

  dispatchSaleStock(body: DispatchSaleStockRequest) {
    return this.http.post<{ ok: boolean; message: string; asignacion: SaleLotAllocationPreviewDto['asignacion'] }>(
      `${this.base}/inventory-movements/sales/dispatch`,
      body,
    );
  }

  // —— Ventas / POS ——
  listSales(filters?: SaleListFiltersRequest) {
    const params: Record<string, string> = {};
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    if (filters?.customerId) params['customerId'] = filters.customerId;
    if (filters?.estado) params['estado'] = filters.estado;
    if (filters?.documentType) params['documentType'] = filters.documentType;
    if (filters?.from) params['from'] = filters.from;
    if (filters?.to) params['to'] = filters.to;
    return this.http.get<PaginatedResponseDto<SaleListItemDto>>(`${this.base}/sales`, { params });
  }

  getSale(id: string) {
    return this.http.get<SaleDetailDto>(`${this.base}/sales/${id}`);
  }

  getPosCatalog(warehouseId: string, search?: string) {
    const params: Record<string, string> = { warehouseId };
    if (search?.trim()) params['search'] = search.trim();
    return this.http.get<PosCatalogItemDto[]>(`${this.base}/sales/pos-catalog`, { params });
  }

  checkSaleInteractions(productIds: string[]) {
    return this.http.post<SaleInteractionsCheckDto>(`${this.base}/sales/check-interactions`, {
      productIds,
    });
  }

  createSale(body: CreateSaleRequest, idempotencyKey?: string) {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    return this.http.post<SaleDetailDto>(`${this.base}/sales`, body, { headers });
  }

  voidSale(id: string, reason: string) {
    return this.http.post<SaleDetailDto>(`${this.base}/sales/${id}/void`, { reason });
  }

  createSaleReturn(saleId: string, body: CreateSaleReturnRequest) {
    return this.http.post<SaleReturnResponseDto>(`${this.base}/sales/${saleId}/returns`, body);
  }

  // —— Caja ——
  listCashRegisters() {
    return this.http.get<CashRegisterDto[]>(`${this.base}/cash-registers`);
  }

  getActiveCashSession() {
    return this.http.get<CashActiveSessionDto | null>(`${this.base}/cash-registers/sessions/active`);
  }

  openCashSession(body: OpenCashSessionRequest) {
    return this.http.post<{ id: string; montoApertura: string; openedAt: string }>(
      `${this.base}/cash-registers/sessions/open`,
      body,
    );
  }

  closeCashSession(sessionId: string, body: CloseCashSessionRequest) {
    return this.http.post<{
      ok: boolean;
      montoCierreSistema: string;
      montoCierreFisico: string;
      diferenciaArqueo: string;
    }>(`${this.base}/cash-registers/sessions/${sessionId}/close`, body);
  }

  getCashSessionSummary(sessionId: string) {
    return this.http.get<CashSessionSummaryDto>(
      `${this.base}/cash-registers/sessions/${sessionId}/summary`,
    );
  }

  addCashMovement(sessionId: string, body: CashMovementRequest) {
    return this.http.post<{ ok: boolean }>(
      `${this.base}/cash-registers/sessions/${sessionId}/movements`,
      body,
    );
  }

  // —— Cotizaciones ——
  listQuotations(page = 1, pageSize = 10) {
    return this.http.get<PaginatedResponseDto<QuotationListItemDto>>(`${this.base}/quotations`, {
      params: { page: String(page), pageSize: String(pageSize) },
    });
  }

  getQuotation(id: string) {
    return this.http.get<QuotationDetailDto>(`${this.base}/quotations/${id}`);
  }

  createQuotation(body: CreateQuotationRequest) {
    return this.http.post<QuotationDetailDto>(`${this.base}/quotations`, body);
  }

  sendQuotation(id: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/quotations/${id}/send`, {});
  }

  // —— Compras (Fase 4) ——
  listPurchaseOrders(filters?: { page?: number; pageSize?: number; supplierId?: string; estado?: PurchaseOrderStatus }) {
    const params: Record<string, string> = {};
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    if (filters?.supplierId) params['supplierId'] = filters.supplierId;
    if (filters?.estado) params['estado'] = filters.estado;
    return this.http.get<PaginatedResponseDto<PurchaseOrderListItemDto>>(
      `${this.base}/purchases/purchase-orders`,
      { params },
    );
  }

  getPurchaseOrder(id: string) {
    return this.http.get<PurchaseOrderDetailDto>(`${this.base}/purchases/purchase-orders/${id}`);
  }

  createPurchaseOrder(body: CreatePurchaseOrderRequest) {
    return this.http.post<PurchaseOrderDetailDto>(`${this.base}/purchases/purchase-orders`, body);
  }

  approvePurchaseOrder(id: string) {
    return this.http.post<PurchaseOrderDetailDto>(`${this.base}/purchases/purchase-orders/${id}/approve`, {});
  }

  sendPurchaseOrder(id: string) {
    return this.http.post<PurchaseOrderDetailDto>(`${this.base}/purchases/purchase-orders/${id}/send`, {});
  }

  cancelPurchaseOrder(id: string) {
    return this.http.post<PurchaseOrderDetailDto>(`${this.base}/purchases/purchase-orders/${id}/cancel`, {});
  }

  receivePurchaseOrder(id: string, body: CreateGoodsReceiptRequest) {
    return this.http.post<PurchaseOrderDetailDto>(
      `${this.base}/purchases/purchase-orders/${id}/receipts`,
      body,
    );
  }

  listAccountsPayable(filters?: { page?: number; pageSize?: number; supplierId?: string }) {
    const params: Record<string, string> = {};
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    if (filters?.supplierId) params['supplierId'] = filters.supplierId;
    return this.http.get<PaginatedResponseDto<AccountPayableListItemDto>>(
      `${this.base}/purchases/accounts-payable`,
      { params },
    );
  }

  registerAccountPayablePayment(id: string, body: { amount: number; metodo?: string; referencia?: string }) {
    return this.http.post<{ ok: boolean; saldo: string; estado: string }>(
      `${this.base}/purchases/accounts-payable/${id}/payments`,
      body,
    );
  }

  createSupplierCreditNote(body: {
    supplierId: string;
    monto: number;
    motivo: string;
    accountPayableId?: string;
    purchaseOrderId?: string;
    numero?: string;
  }) {
    return this.http.post<{ ok: boolean; id: string }>(`${this.base}/purchases/supplier-credit-notes`, body);
  }

  getReplenishmentReport(warehouseId?: string) {
    const params: Record<string, string> = {};
    if (warehouseId) params['warehouseId'] = warehouseId;
    return this.http.get<{ items: ReplenishmentSuggestionDto[]; generatedAt: string }>(
      `${this.base}/purchases/reports/replenishment`,
      { params },
    );
  }

  getPriceComparisonReport(productId?: string) {
    const params: Record<string, string> = {};
    if (productId) params['productId'] = productId;
    return this.http.get<{ items: PriceComparisonItemDto[] }>(
      `${this.base}/purchases/reports/price-comparison`,
      { params },
    );
  }

  // —— Facturación electrónica (Fase 5) ——
  getBillingConfig() {
    return this.http.get<BillingConfigDto>(`${this.base}/billing/config`);
  }

  upsertBillingConfig(body: UpsertBillingConfigRequest) {
    return this.http.patch<BillingConfigDto>(`${this.base}/billing/config`, body);
  }

  listElectronicDocuments(filters?: { page?: number; pageSize?: number; sunatStatus?: SunatDocumentStatus }) {
    const params: Record<string, string> = {};
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.pageSize) params['pageSize'] = String(filters.pageSize);
    if (filters?.sunatStatus) params['sunatStatus'] = filters.sunatStatus;
    return this.http.get<PaginatedResponseDto<ElectronicDocumentListItemDto>>(
      `${this.base}/billing/documents`,
      { params },
    );
  }

  getElectronicDocument(id: string) {
    return this.http.get<ElectronicDocumentDetailDto>(`${this.base}/billing/documents/${id}`);
  }

  emitElectronicDocumentFromSale(saleId: string) {
    return this.http.post<ElectronicDocumentDetailDto>(`${this.base}/billing/sales/${saleId}/emit`, {});
  }

  getSaleBillingStatus(saleId: string) {
    return this.http.get<SaleBillingStatusDto | null>(`${this.base}/billing/sales/${saleId}/status`);
  }

  retryElectronicDocument(id: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/billing/documents/${id}/retry`, {});
  }

  voidElectronicDocument(id: string, reason: string) {
    return this.http.post<ElectronicDocumentDetailDto>(`${this.base}/billing/documents/${id}/void`, { reason });
  }

  sendDailyBillingSummary(fecha: string) {
    return this.http.post<{ ok: boolean; id: string }>(`${this.base}/billing/daily-summary`, { fecha });
  }

  validateBillingRuc(ruc: string) {
    return this.http.get<ValidateRucResponseDto>(`${this.base}/billing/validate-ruc/${encodeURIComponent(ruc)}`);
  }

  refreshElectronicDocumentStatus(id: string) {
    return this.http.post<{ ok: boolean; sunatStatus: SunatDocumentStatus }>(
      `${this.base}/billing/documents/${id}/refresh-status`,
      {},
    );
  }

  emitGuiaFromTransfer(transferId: string) {
    return this.http.post<ElectronicDocumentDetailDto>(
      `${this.base}/billing/transfers/${transferId}/emit-guia`,
      {},
    );
  }

  emitSpecialElectronicDocument(body: EmitSpecialDocumentRequest) {
    return this.http.post<ElectronicDocumentDetailDto>(`${this.base}/billing/documents/special`, body);
  }

  fileDownloadUrl(fileId: string) {
    return `${this.base}/files/${fileId}`;
  }
}
