import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DirectoryApiService } from './directory-api.service';
import { environment } from '../../../../environments/environment';

describe('DirectoryApiService', () => {
  let service: DirectoryApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DirectoryApiService],
    });
    service = TestBed.inject(DirectoryApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listUsers envía filtros de paginación', () => {
    service.listUsers({ search: 'maria', role: 'VENDEDOR', page: 2, pageSize: 10 }).subscribe();

    const req = http.expectOne(
      (r) =>
        r.url === `${environment.apiBaseUrl}/users` &&
        r.params.get('search') === 'maria' &&
        r.params.get('role') === 'VENDEDOR' &&
        r.params.get('page') === '2' &&
        r.params.get('pageSize') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 2, pageSize: 10, totalPages: 1 });
  });

  it('getDashboardStats consulta KPIs', () => {
    service.getDashboardStats().subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/dashboard/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({
      usersActive: 1,
      establishmentsActive: 1,
      customersActive: 0,
      productsActive: 0,
    });
  });
});
