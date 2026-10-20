import { AxiosError } from 'axios';
import { AmoCrmService } from './amo-crm.service';
import { FieldDto } from './get-workspace-info.dto';

describe('AmoCrmService custom fields pagination', () => {
  const options = {
    amoCrmDomainName: 'example.amocrm.ru',
    tokens: { accessToken: 'access', refreshToken: 'refresh' },
  };
  const fields = Array.from({ length: 501 }, (_, index) => ({ id: index + 1, name: `Field ${index + 1}` }) as FieldDto);
  let get: jest.Mock;
  let checkRateLimit: jest.Mock;
  let service: AmoCrmService;

  function page(items: FieldDto[], number: number, next: boolean) {
    return {
      status: 200,
      data: {
        _page: number,
        _links: next ? { next: { href: `https://example.amocrm.ru/api/v4/leads/custom_fields?page=${number + 1}` } } : {},
        _embedded: { custom_fields: items },
      },
    };
  }

  beforeEach(() => {
    get = jest.fn();
    checkRateLimit = jest.fn().mockResolvedValue(undefined);
    service = new AmoCrmService(
      { get } as any,
      { error: jest.fn() } as any,
      {} as any,
      {} as any,
      { updateRateLimitAndThrowIfNeed: checkRateLimit } as any
    );
  });

  it.each([0, 1, 250, 251, 500, 501])('returns all %i fields and checks the rate limit for each page', async count => {
    const expected = fields.slice(0, count);
    const pages = Math.max(1, Math.ceil(count / 250));
    for (let number = 1; number <= pages; number++) {
      get.mockResolvedValueOnce(page(expected.slice((number - 1) * 250, number * 250), number, number < pages));
    }

    expect(await service.getLeadFields(options)).toEqual(expected);
    expect(get).toHaveBeenCalledTimes(pages);
    expect(checkRateLimit).toHaveBeenCalledTimes(pages);
    for (let number = 1; number <= pages; number++) {
      expect(get).toHaveBeenNthCalledWith(number, 'https://example.amocrm.ru/api/v4/leads/custom_fields', {
        params: { page: number, limit: 250 },
        headers: { Authorization: 'Bearer access' },
      });
    }
  });

  it('continues a short page when the API provides a next link', async () => {
    get.mockResolvedValueOnce(page(fields.slice(0, 50), 1, true)).mockResolvedValueOnce(page(fields.slice(50, 51), 2, false));
    expect(await service.getLeadFields(options)).toEqual(fields.slice(0, 51));
  });

  it('uses the page count when next links are absent', async () => {
    const first = page(fields.slice(0, 250), 1, false);
    get.mockResolvedValueOnce({ ...first, data: { ...first.data, _page_count: 2 } });
    get.mockResolvedValueOnce(page(fields.slice(250, 251), 2, false));
    expect(await service.getLeadFields(options)).toEqual(fields.slice(0, 251));
  });

  it('accepts a 204 response without a body', async () => {
    get.mockResolvedValueOnce({ status: 204, data: '' });
    expect(await service.getLeadFields(options)).toEqual([]);
  });

  it('propagates a later page error instead of returning an incomplete list', async () => {
    const error = new Error('Page unavailable');
    get.mockResolvedValueOnce(page(fields.slice(0, 250), 1, true)).mockRejectedValueOnce(error);
    await expect(service.getLeadFields(options)).rejects.toBe(error);
  });

  it('resolves the invalid field name beyond the first 250 fields', async () => {
    get.mockResolvedValueOnce(page(fields.slice(0, 250), 1, true)).mockResolvedValueOnce(page(fields.slice(250, 251), 2, false));
    const error = new AxiosError('Bad request', undefined, {
      data: JSON.stringify({ custom_fields_values: [{ field_id: 251 }] }),
    } as any);
    error.response = {
      status: 400,
      data: { 'validation-errors': [{ errors: [{ code: 'InvalidType', path: 'custom_fields_values.0.values.0.value' }] }] },
    } as any;

    const result = await service.getExceptionType(error, options.amoCrmDomainName, options.tokens);
    expect(result.humanMessage).toContain('Field 251');
  });
});
