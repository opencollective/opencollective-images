import { asyncHandler } from '../../src/server/middlewares';

describe('asyncHandler', () => {
  test('forwards rejected Express 4 route work to next', async () => {
    const error = new Error('async route failure');
    const next = jest.fn();

    await asyncHandler(async () => {
      throw error;
    })({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
