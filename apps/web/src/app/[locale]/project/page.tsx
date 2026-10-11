import { getTranslations } from "next-intl/server";
import { getAllProjects } from "@/app/actions/projects";
import ProjectShowcase from "@/components/ProjectShowcase";
import HomeNavSidebar from "@/components/HomeNavSidebar";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("projectShowcase");

  const res = await getAllProjects();
  const projects = res.success ? res.projects : [];

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F2EF] dark:bg-[#18191A] pt-16 sm:pt-20 md:pt-24 pb-10 sm:pb-16 md:pb-12 overflow-x-hidden">
      <HomeNavSidebar activeTab="project" />
      <div className="flex-1 flex justify-center lg:ml-[72px] overflow-x-hidden">
        <div className="max-w-[1200px] w-full px-0 lg:px-4 overflow-x-hidden">
          <ProjectShowcase 
            projects={projects} 
            title={t("pageTitle")}
            subtitle={t("pageSubtitle")}
          />
        </div>
      </div>
    </div>
  );
}
