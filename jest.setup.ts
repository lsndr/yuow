import * as matchers from 'jest-extended';
import { RepositoryMock } from './tests/core/utils/repository.mock';
expect.extend(matchers);

afterEach(() => {
  RepositoryMock.restore();
});
