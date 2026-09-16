import { parseAmoCrmAccountDomain } from './amo-crm-domain';

describe('parseAmoCrmAccountDomain', () => {
  it.each([
    ['account.amocrm.ru', 'account.amocrm.ru'],
    ['ACCOUNT.AMOCRM.RU', 'account.amocrm.ru'],
    ['  account.amocrm.ru  ', 'account.amocrm.ru'],
    ['nested.account.amocrm.ru', 'nested.account.amocrm.ru'],
    ['account_subdomain.amocrm.ru', 'account_subdomain.amocrm.ru'],
  ])('accepts %s', (value, expected) => {
    expect(parseAmoCrmAccountDomain(value)).toBe(expected);
  });

  it.each([
    'amocrm.ru',
    'account.amocrm.com',
    'account.kommo.com',
    'account.amocrm.ru.evil.example',
    'account.amocrm.ru@evil.example',
    'evil.example#account.amocrm.ru',
    'https://account.amocrm.ru',
    'account.amocrm.ru:8443',
    'account.amocrm.ru/oauth2/access_token',
    '127.0.0.1',
    '',
  ])('rejects %s', value => {
    expect(parseAmoCrmAccountDomain(value)).toBeNull();
  });
});
