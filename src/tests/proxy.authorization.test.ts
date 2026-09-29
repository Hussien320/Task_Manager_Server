import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { authService } from '@/services/AuthService';
import { ROLE } from '@/types/Roles';

jest.mock('@/services/AuthService', () => ({
  authService: {
    validateAccessToken: jest.fn(),
    clearAuthCookies: jest.fn(),
  },
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;

function makeAuthenticatedRequest(path: string, role: ROLE) {
  const request = new NextRequest(`http://localhost${path}`);
  request.cookies.set('auth_token', 'valid-token');
  mockedAuthService.validateAccessToken.mockResolvedValue({
    userId: 'user-1',
    userRole: role,
  } as never);
  return request;
}

describe('page role authorization in proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects employees away from the admin dashboard', async () => {
    const response = await proxy(
      makeAuthenticatedRequest('/dashboard', ROLE.EMPLOYEE)
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/unauthorized');
  });

  it('allows employees to access product pages', async () => {
    const response = await proxy(
      makeAuthenticatedRequest('/products', ROLE.EMPLOYEE)
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows admins to access the dashboard', async () => {
    const response = await proxy(
      makeAuthenticatedRequest('/dashboard', ROLE.ADMIN)
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});