import CommentEditor from "@/components/activity/comment-editor";

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <CommentEditor
      value={content}
      readOnly
      showBubbleMenu={false}
      proseClassName="kolab-tiptap-prose"
      contentClassName="kolab-tiptap-content"
      className="[&_.kolab-tiptap-content_.ProseMirror]:max-h-none [&_.kolab-tiptap-content_.ProseMirror]:overflow-visible [&_.kolab-tiptap-content_.ProseMirror]:px-0 [&_.kolab-tiptap-content_.ProseMirror]:py-0"
    />
  );
}
