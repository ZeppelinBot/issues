"use server";

import { redirect } from "next/navigation";
import { v4 as uuidV4 } from "uuid";
import { z } from "zod";
import { auth } from "../../../src/features/auth/auth";
import { feedbackStatus } from "../../../src/features/feedback/feedbackStatus";
import { orm } from "../../../src/orm";
import { feedbackPosts } from "../../../src/features/feedback/repositories/feedbackPosts";
import { feedbackVotes } from "../../../src/features/feedback/repositories/feedbackVotes";

const zData = z.object({
  title: z.string().min(3).max(255),
  body: z.string().min(80).max(8_000),
});

export async function postFeedback(fd: FormData) {
  const session = await auth();
  if (! session) {
    throw new Error("Not logged in");
  }

  const data = zData.parse({
    title: fd.get("title"),
    body: fd.get("body"),
  });

  const post = await orm.transaction(async (trxOrm) => {
    const now = new Date();

    const post = await feedbackPosts.create({
      author_id: session.user.id,
      title: data.title,
      body: data.body,
      num_comments: 0,
      num_votes: 1, // Automatic self-vote
      posted_at: now,
      status: feedbackStatus.Enum.open,
      last_active_at: now,
    });

    await feedbackVotes.add(post.id, session.user.id);

    return post;
  });

  redirect(`/feedback/${post.id}`);
}
