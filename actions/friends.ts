"use server";

import { db } from "@/db/index";
import { user, friendRequests, friendships } from "@/db/schema";
import { eq, and, or, ne, like, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";

export async function searchUsers(query: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  if (!query || query.length < 2) return [];

  const results = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(
      and(
        ne(user.id, currentUser.id),
        or(like(user.name, `%${query}%`), like(user.email, `%${query}%`)),
      ),
    )
    .limit(10);

  return results;
}

export async function sendFriendRequest(receiverId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  if (currentUser.id === receiverId) {
    return {
      success: false as const,
      error: "Cannot send request to yourself",
    };
  }

  const existing = await db.query.friendRequests.findFirst({
    where: or(
      and(
        eq(friendRequests.senderId, currentUser.id!),
        eq(friendRequests.receiverId, receiverId),
      ),
      and(
        eq(friendRequests.senderId, receiverId),
        eq(friendRequests.receiverId, currentUser.id!),
      ),
    ),
  });

  if (existing) {
    return { success: false as const, error: "Friend request already exists" };
  }

  const friendship = await db.query.friendships.findFirst({
    where: or(
      and(
        eq(friendships.userAId, currentUser.id!),
        eq(friendships.userBId, receiverId),
      ),
      and(
        eq(friendships.userAId, receiverId),
        eq(friendships.userBId, currentUser.id!),
      ),
    ),
  });

  if (friendship) {
    return { success: false as const, error: "Already friends" };
  }

  await db.insert(friendRequests).values({
    senderId: currentUser.id!,
    receiverId,
  });

  return { success: true as const };
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const request = await db.query.friendRequests.findFirst({
    where: eq(friendRequests.id, requestId),
  });

  if (!request || request.receiverId !== currentUser.id) {
    return { success: false as const, error: "Request not found" };
  }

  if (request.status !== "pending") {
    return { success: false as const, error: "Request already handled" };
  }

  if (accept) {
    const [userAId, userBId] = [request.senderId, request.receiverId].sort();
    await db
      .update(friendRequests)
      .set({ status: "accepted" })
      .where(eq(friendRequests.id, requestId));
    await db.insert(friendships).values({ userAId, userBId });
  } else {
    await db
      .update(friendRequests)
      .set({ status: "rejected" })
      .where(eq(friendRequests.id, requestId));
  }

  return { success: true as const };
}

export async function removeFriend(friendId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(friendships)
    .where(
      or(
        and(
          eq(friendships.userAId, currentUser.id),
          eq(friendships.userBId, friendId),
        ),
        and(
          eq(friendships.userAId, friendId),
          eq(friendships.userBId, currentUser.id),
        ),
      ),
    );

  await db
    .delete(friendRequests)
    .where(
      or(
        and(
          eq(friendRequests.senderId, currentUser.id),
          eq(friendRequests.receiverId, friendId),
        ),
        and(
          eq(friendRequests.senderId, friendId),
          eq(friendRequests.receiverId, currentUser.id),
        ),
      ),
    );

  return { success: true as const };
}

export async function getFriends() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const friendshipsA = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(friendships)
    .innerJoin(user, eq(friendships.userBId, user.id))
    .where(eq(friendships.userAId, currentUser.id));

  const friendshipsB = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(friendships)
    .innerJoin(user, eq(friendships.userAId, user.id))
    .where(eq(friendships.userBId, currentUser.id));

  return [...friendshipsA, ...friendshipsB];
}

export async function getPendingRequests() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const requests = await db
    .select({
      id: friendRequests.id,
      senderId: friendRequests.senderId,
      receiverId: friendRequests.receiverId,
      status: friendRequests.status,
      createdAt: friendRequests.createdAt,
      sender: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(friendRequests)
    .innerJoin(user, eq(friendRequests.senderId, user.id))
    .where(
      and(
        eq(friendRequests.receiverId, currentUser.id),
        eq(friendRequests.status, "pending"),
      ),
    )
    .orderBy(desc(friendRequests.createdAt));

  return requests;
}
