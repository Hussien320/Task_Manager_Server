describe('Test Suite Description', () => {
  beforeAll(() => {
    console.log('Running before all tests');
  });

  beforeEach(() => {
    console.log('Running before each test');
  });

  afterEach(() => {
    console.log('Running after each test');
  });

  afterAll(() => {
    console.log('Running after all tests');
  });

  it('Should 1 + 1 equal to 2', () => {
    expect(1 + 1).toBe(2);
  });
});