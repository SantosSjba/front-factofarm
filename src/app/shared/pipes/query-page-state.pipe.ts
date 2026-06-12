import { Pipe, PipeTransform } from '@angular/core';
import { httpErrorMessage } from '../../core/http/http-error-message';

type QueryLike = {
  isPending: () => boolean;
  isError: () => boolean;
  error: unknown;
};

export type QueryPageStateView = {
  loading: boolean;
  error: string | null;
  empty: boolean;
};

export function mapQueryPageState(
  query: QueryLike | null | undefined,
  itemCount = 0,
  errorFallback = 'No se pudo cargar la información.',
): QueryPageStateView {
  if (!query) {
    return { loading: false, error: null, empty: itemCount === 0 };
  }

  const loading = query.isPending();
  const error = query.isError()
    ? httpErrorMessage(query.error, errorFallback)
    : null;
  const empty = !loading && !error && itemCount === 0;

  return { loading, error, empty };
}

@Pipe({
  name: 'queryPageState',
  standalone: true,
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
