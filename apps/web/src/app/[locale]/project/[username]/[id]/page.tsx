import { Suspense } from "react";
import { getProjectById } from "@/app/actions/projects";
import ClientProjectDetailPage from "./ClientProjectDetailPage";
import { notFound } from "next/navigation";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; username: string; id: string }>;
}) {
  const { locale, username, id } = await params;
  const decodedUsername = decodeURIComponent(username);
  
  // Note: Since we are in a server component, we can't easily know the current user ID for hasLiked. 
  // Wait, Next.js cache bypasses on Server Actions, but Server Components fetch just fine.
  // We can pass null or try to get user session if we have it, but for now we pass undefined.
  const { success, project } = await getProjectById(id);

  if (!success || !project) {
    notFound();
  }

  // Double check username matches
  if (project.user?.username?.toLowerCase() !== decodedUsername.toLowerCase()) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <ClientProjectDetailPage 
        locale={locale} 
        username={decodedUsername}
        id={id}
        initialProject={project} 
      />
    </Suspense>
  );
}
