import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = jwt.sign(
    {
      userId: session.user.id,
      name: session.user.name,
      image: session.user.image,
    },
    process.env.SOCKET_JWT_SECRET!,
    {
      expiresIn: "10m",
    }
  );

  return NextResponse.json({ token });
}