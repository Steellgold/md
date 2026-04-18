"use client";

import { Tree, TreeItem, TreeItemLabel } from "@/components/ui/tree";
import { cn } from "@/lib/utils";
import { type MarkdownWorkspace } from "@/types/markdown";
import { hotkeysCoreFeature, syncDataLoaderFeature } from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { FileTextIcon, FolderIcon } from "lucide-react";
import { useMemo } from "react";

type WorkspaceTreeNode = {
  id: string;
  name: string;
  relativePath: string | null;
  documentId: string | null;
  isFolder: boolean;
  children: string[];
};

type MarkdownWorkspaceTreeProps = {
  workspace: MarkdownWorkspace;
  activeRelativePath: string | null;
  openWorkspacePageAction: (relativePath: string) => void;
};

const ROOT_NODE_ID = "workspace-root";

const makeFolderNodeId = (path: string) => `folder:${path}`;
const makeFileNodeId = (path: string) => `file:${path}`;

const buildWorkspaceTreeNodes = (workspace: MarkdownWorkspace) => {
  const nodes = new Map<string, WorkspaceTreeNode>();
  const pageIdsByRelativePath = new Map(
    workspace.pages.map((page) => [page.relativePath, page.id] as const)
  );

  nodes.set(ROOT_NODE_ID, {
    id: ROOT_NODE_ID,
    name: workspace.name,
    relativePath: null,
    documentId: null,
    isFolder: true,
    children: [],
  });

  for (const page of workspace.pages) {
    const segments = page.relativePath.split("/");
    let parentId = ROOT_NODE_ID;
    let parentPath = "";

    for (const [index, segment] of segments.entries()) {
      const isFile = index === segments.length - 1;
      const currentPath = parentPath ? `${parentPath}/${segment}` : segment;
      const nodeId = isFile ? makeFileNodeId(currentPath) : makeFolderNodeId(currentPath);

      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          name: segment,
          relativePath: isFile ? currentPath : null,
          documentId: isFile ? pageIdsByRelativePath.get(currentPath) ?? null : null,
          isFolder: !isFile,
          children: [],
        });
      }

      const parentNode = nodes.get(parentId);

      if (parentNode && !parentNode.children.includes(nodeId)) {
        parentNode.children.push(nodeId);
      }

      parentId = nodeId;
      parentPath = currentPath;
    }
  }

  for (const node of nodes.values()) {
    node.children.sort((left, right) => {
      const leftNode = nodes.get(left);
      const rightNode = nodes.get(right);

      if (!leftNode || !rightNode) {
        return 0;
      }

      if (leftNode.isFolder && !rightNode.isFolder) {
        return -1;
      }

      if (!leftNode.isFolder && rightNode.isFolder) {
        return 1;
      }

      return leftNode.name.localeCompare(rightNode.name);
    });
  }

  return nodes;
};

const getExpandedFoldersForPath = (relativePath: string | null) => {
  if (!relativePath) {
    return [ROOT_NODE_ID];
  }

  const segments = relativePath.split("/");
  const expanded = [ROOT_NODE_ID];
  let current = "";

  for (const segment of segments.slice(0, -1)) {
    current = current ? `${current}/${segment}` : segment;
    expanded.push(makeFolderNodeId(current));
  }

  return expanded;
};

export const MarkdownWorkspaceTree = ({
  workspace,
  activeRelativePath,
  openWorkspacePageAction,
}: MarkdownWorkspaceTreeProps) => {
  const nodes = useMemo(() => buildWorkspaceTreeNodes(workspace), [workspace]);
  const rootNode = nodes.get(ROOT_NODE_ID);
  const expandedItems = useMemo(
    () => getExpandedFoldersForPath(activeRelativePath),
    [activeRelativePath]
  );

  const tree = useTree<WorkspaceTreeNode>({
    rootItemId: ROOT_NODE_ID,
    getItemName: (item) => item.getItemData()?.name ?? "",
    isItemFolder: (item) => item.getItemData()?.isFolder ?? false,
    dataLoader: {
      getItem: (itemId) => {
        const node = nodes.get(itemId) ?? rootNode;

        if (!node) {
          throw new Error("Workspace tree root node is missing.");
        }

        return node;
      },
      getChildren: (itemId) => nodes.get(itemId)?.children ?? [],
    },
    initialState: {
      expandedItems,
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
  });

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-md border bg-background/60 px-2 py-2">
      <Tree tree={tree} indent={16}>
        {tree.getItems().map((item) => {
          const node = item.getItemData();

          if (!node) {
            return null;
          }

          const isActiveFile =
            !node.isFolder &&
            Boolean(node.relativePath) &&
            node.relativePath === activeRelativePath;

          return (
            <TreeItem key={item.getId()} item={item}>
              <TreeItemLabel
              className={cn(
                "gap-2",
                isActiveFile && "bg-primary/10 text-primary hover:bg-primary/15"
              )}
              onClick={() => {
                if (!node.isFolder && node.relativePath) {
                  openWorkspacePageAction(node.relativePath);
                }
              }}
            >
                {node.isFolder ? (
                  <FolderIcon className="size-3.5" />
                ) : (
                  <FileTextIcon className="size-3.5" />
                )}
                <span className="truncate">{node.name}</span>
              </TreeItemLabel>
            </TreeItem>
          );
        })}
      </Tree>
    </div>
  );
};
