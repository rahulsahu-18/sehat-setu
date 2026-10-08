import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
  role: string;
  facilityId?: string;
}

export const generateToken = (payload: TokenPayload) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as NonNullable<
    jwt.SignOptions["expiresIn"]
  >;

  return jwt.sign(payload, secret, { expiresIn });
};