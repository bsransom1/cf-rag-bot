import ChatWindow from "@/components/ChatWindow";
import { getProject } from "@/lib/config/project";
import type { Metadata } from "next";

const project = getProject("italian_notary");

export const metadata: Metadata = {
  title: `${project.brandName ?? project.name} — Assistant`,
  description:
    "Full-size ItalianNotary.com assistant for review (not the iframe embed).",
  robots: { index: false, follow: false },
};

export default function ItalianNotaryPage() {
  return (
    <ChatWindow
      projectId="italian_notary"
      brandName={project.brandName ?? "ItalianNotary.com"}
    />
  );
}
