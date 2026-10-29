import { isValidStellarPublicKey } from '@/lib/stellarAddress';

describe('isValidStellarPublicKey', () => {
  it.each([
    'GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WIS',
    'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
    'GBPXXOA5N4JYPESHAADMQKBPWZWQDQ64ZV6ZL2S3LAGW4SY7NTCMWIVL',
  ])('accepts the valid account ID %s', (address) => {
    expect(isValidStellarPublicKey(address)).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(isValidStellarPublicKey('  GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WIS\n')).toBe(true);
  });

  it.each([
    ['a single mistyped character', 'GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WIT'],
    ['two swapped characters', 'GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZW7IS'],
    ['a non-base32 character', 'GBPXX0A5N4JYPESHAADMQKBPWZWQDQ64ZV6ZL2S3LAGW4SY7NTCMWIVL'],
    ['lowercase input', 'gbk5ruoq44lhr4iqdkrljadlkclo6lqdcs7eryo7vtvhabxbr4bz7wis'],
    ['a missing character', 'GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WI'],
    ['an extra character', 'GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WISA'],
    ['a secret seed', 'SBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WIS'],
    ['a contract address', 'CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5'],
    ['an empty string', ''],
  ])('rejects %s', (_label, address) => {
    expect(isValidStellarPublicKey(address)).toBe(false);
  });
});
