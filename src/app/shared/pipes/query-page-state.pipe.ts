import { Pipe, PipeTransform } from '@angular/core';
import { httpErrorMessage } from '../../core/http/http-error-message';

type QueryLike = {
  isPending: () => boolean;
  isLoading?: () => boolean;
  isFetching?: () => boolean;
  isError: () => boolean;
  error: unknown;
};

export type QueryPageStateView = {
  loading: boolean;
  error: string | null;
  empty: boolean;
};

/** Indica si la consulta sigue cargando datos (no confundir con isPending en queries deshabilitadas). */
export function resolveQueryLoading(query: QueryLike): boolean {
  if (typeof query.isLoading === 'function') {
    return query.isLoading();
  }
  if (typeof query.isFetching === 'function') {
    return query.isPending() && query.isFetching();
  }
  return query.isPending();
}

export function mapQueryPageState(
  query: QueryLike | null | undefined,
  itemCount = 0,
  errorFallback = 'No se pudo cargar la información.',
): QueryPageStateView {
  if (!query) {
    return { loading: false, error: null, empty: itemCount === 0 };
  }

  const loading = resolveQueryLoading(query);
  const error = query.isError()
    ? httpErrorMessage(query.error, errorFallback)
    : null;
  const empty = !loading && !error && itemCount === 0;

  return { loading, error, empty };
}

@Pipe({
  name: 'queryPageState',
  standalone: true,
  /** Debe re-evaluarse cuando la query pasa de pending → success con total 0. */
  pure: false,
})
export class QueryPageStatePipe implements PipeTransform {
  transform(
    query: QueryLike | null | undefined,
    itemCount = 0,
    errorFallback = 'No se pudo cargar la información.',
  ): QueryPageStateView {
    return mapQueryPageState(query, itemCount, errorFallback);
  }
}
