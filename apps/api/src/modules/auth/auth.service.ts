import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '@spare-part/shared';
import type { Prisma } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Account has been disabled');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  const accessToken = signToken({ id: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;

  return { user: safeUser, accessToken };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      phone: input.phone,
      passwordHash,
      role: 'TECHNICIAN',
    },
  });

  const accessToken = signToken({ id: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;

  return { user: safeUser, accessToken };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { passwordHash: true },
  });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
    omit: { passwordHash: true },
  });
  return user;
}

// ── Microsoft O365 SSO ────────────────────────────────────────────────────

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;

interface MsClaims extends JWTPayload {
  oid: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  upn?: string;
}

function getMsJwks() {
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID) {
    throw new AppError(503, 'CONFIG_ERROR', 'Azure AD not configured');
  }

  const tenantForKeys = AZURE_TENANT_ID === 'common' ? 'common' : AZURE_TENANT_ID;
  return createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${tenantForKeys}/discovery/v2.0/keys`)
  );
}

async function verifyMsIdToken(idToken: string): Promise<MsClaims> {
  const jwks = getMsJwks();

  try {
    const { payload } = await jwtVerify<MsClaims>(idToken, jwks, {
      algorithms: ['RS256'],
      audience: AZURE_CLIENT_ID,
      // For common/multi-tenant: issuer contains the actual user's tenant ID,
      // not "common" — so we skip strict issuer check and validate manually below
      ...(AZURE_TENANT_ID !== 'common' && {
        issuer: [
          `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
          `https://sts.windows.net/${AZURE_TENANT_ID}/`,
        ],
      }),
    });

    return payload;
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Microsoft token invalid');
  }
}

export async function loginWithMicrosoft(idToken: string) {
  const claims = await verifyMsIdToken(idToken);

  const email = (claims.preferred_username ?? claims.email ?? claims.upn ?? '').toLowerCase();
  if (!email) throw new AppError(401, 'INVALID_TOKEN', 'Cannot read email from Microsoft token');

  const microsoftId = claims.oid;

  // Find by microsoftId first (fast path), then fall back to email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user = await prisma.user.findFirst({
    where: { OR: [{ microsoftId }, { email }] } as Prisma.UserWhereInput,
  });

  if (!user) {
    const displayName = claims.name ?? email.split('@')[0];
    user = await prisma.user.create({
      data: {
        email,
        name: displayName,
        microsoftId,
        role: 'ADMIN',
        isActive: true,
      } as Prisma.UserCreateInput,
    });
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Account has been disabled');
  }

  // Link microsoftId if first time SSO login
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(user as unknown as Record<string, unknown>).microsoftId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { microsoftId } as Prisma.UserUpdateInput,
    });
  }

  const accessToken = signToken({ id: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, accessToken };
}
