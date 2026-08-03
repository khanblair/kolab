import { mergeAttributes, Node } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { FileText } from "lucide-react";

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function AttachmentCardView({ node }: NodeViewProps) {
  const url = String(node.attrs.url || "");
  const filename = String(node.attrs.filename || "Attachment");
  const mimeType = String(node.attrs.mimeType || "");
  const size = Number(node.attrs.size || 0);

  return (
    <NodeViewWrapper as="span" className="kolab-attachment-node">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="kolab-attachment-card"
        title={filename}
      >
        <span className="kolab-attachment-card-icon">
          <FileText className="size-4" />
        </span>
        <span className="kolab-attachment-card-content">
          <span className="kolab-attachment-card-title">{filename}</span>
          <span className="kolab-attachment-card-meta">
            {formatBytes(size)}
            {mimeType ? ` · ${mimeType}` : ""}
          </span>
        </span>
      </a>
    </NodeViewWrapper>
  );
}

export const AttachmentCard = Node.create({
  name: "attachmentCard",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      url: { default: "" },
      filename: { default: "" },
      mimeType: { default: "" },
      size: { default: 0 },
    };
  },

  parseHTML() {
    return [
      { tag: "kolab-attachment[url]" },
      { tag: "span[data-type='attachment-card'][data-url]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "kolab-attachment",
      mergeAttributes(HTMLAttributes, {
        "data-type": "attachment-card",
        "data-url": HTMLAttributes.url,
        "data-filename": HTMLAttributes.filename,
        "data-mime-type": HTMLAttributes.mimeType,
        "data-size": HTMLAttributes.size,
        url: HTMLAttributes.url,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentCardView);
  },

  renderMarkdown(
    node: {
      attrs?: {
        url?: string;
        filename?: string;
        mimeType?: string;
        size?: number;
      };
    },
    _helpers: unknown,
    _context: unknown,
  ) {
    const url = String(node.attrs?.url || "");
    const filename = String(node.attrs?.filename || "");
    const mimeType = String(node.attrs?.mimeType || "");
    const size = Number(node.attrs?.size || 0);

    if (!url) return "";

    return `\n<kolab-attachment url="${url}" filename="${filename}" mime-type="${mimeType}" size="${size}" />\n`;
  },
});
