"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type CollaborationParticipant } from "@/types/markdown";

type MarkdownCollaboratorAvatarsProps = {
  collaborators: CollaborationParticipant[];
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const MarkdownCollaboratorAvatars = ({
  collaborators,
}: MarkdownCollaboratorAvatarsProps) => {
  if (collaborators.length === 0) {
    return null;
  }

  const visibleCollaborators = collaborators.slice(0, 4);
  const remainingCollaborators = collaborators.length - visibleCollaborators.length;
  const overflowCollaborators = collaborators.slice(4);

  return (
    <TooltipProvider delayDuration={150}>
      <AvatarGroup className="bg-card rounded-full ring-1 ring-border px-0.5 py-0.5">
        {visibleCollaborators.map((participant) => (
          <Tooltip key={participant.id}>
            <TooltipTrigger asChild>
              <Avatar
                size="sm"
                style={{
                  outline: `2px solid ${participant.color}`,
                  outlineOffset: "-1px",
                }}
              >
                <AvatarImage src={participant.avatarUrl} alt={participant.name} />
                <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              {participant.isLocal ? `${participant.name} (You)` : participant.name}
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCollaborators > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroupCount>+{remainingCollaborators}</AvatarGroupCount>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              {overflowCollaborators
                .map((participant) =>
                  participant.isLocal ? `${participant.name} (You)` : participant.name
                )
                .join(", ")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </AvatarGroup>
    </TooltipProvider>
  );
};
