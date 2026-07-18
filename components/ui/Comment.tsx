import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/format";

export interface CommentData {
  id: string;
  authorName: string;
  authorColorIndex?: number;
  createdAt: Date;
  content: string;
  isEdited?: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  isOwn?: boolean;
}

export interface CommentActionHandlers {
  onToggleLike?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface CommentBodyProps extends CommentActionHandlers {
  comment: CommentData;
  avatarSize: "sm" | "md";
  indent?: boolean;
  onReply?: () => void;
  editing?: boolean;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  children?: ReactNode;
}

// Compartilhado por <Comment> e <CommentReply> — mesma estrutura visual de
// components/reader/ReaderView.tsx (renderComment), variando só tamanho do avatar e indentação.
function CommentBody({
  comment,
  avatarSize,
  indent,
  onReply,
  onToggleLike,
  onEdit,
  onDelete,
  editing,
  editValue = "",
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  children,
}: CommentBodyProps) {
  return (
    <div className={`flex items-start gap-[11px] ${indent ? "mt-3 pl-[15px]" : ""}`}>
      <Avatar name={comment.authorName} colorIndex={comment.authorColorIndex} size={avatarSize} />
      <div className="flex-1">
        <div className="flex items-baseline gap-[7px]">
          <span className="text-xs font-semibold text-ink">{comment.authorName}</span>
          <span className="text-[10px] text-text-muted">{formatRelativeTime(comment.createdAt)}</span>
          {comment.isEdited && <span className="text-[10px] text-text-muted">· editado</span>}
        </div>

        {editing ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <textarea
              value={editValue}
              onChange={(event) => onEditValueChange?.(event.target.value)}
              rows={2}
              className="rounded-[10px] border border-input-border bg-background p-2.5 text-sm text-ink"
            />
            <div className="flex items-center gap-3">
              <button type="button" onClick={onSaveEdit} className="text-[11px] font-semibold text-ink">
                Salvar
              </button>
              <button type="button" onClick={onCancelEdit} className="text-[11px] font-semibold text-text-muted">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-0.5 font-serif text-sm text-text-secondary">{comment.content}</div>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleLike}
                className={`text-[11px] font-semibold ${comment.likedByMe ? "text-ink" : "text-text-muted"}`}
              >
                {comment.likedByMe ? "♥" : "♡"} {comment.likeCount ? comment.likeCount : ""}
              </button>
              {onReply && (
                <button type="button" onClick={onReply} className="text-[11px] font-semibold text-text-muted">
                  Responder
                </button>
              )}
              {comment.isOwn && (
                <>
                  <button type="button" onClick={onEdit} className="text-[11px] font-semibold text-text-muted">
                    Editar
                  </button>
                  <button type="button" onClick={onDelete} className="text-[11px] font-semibold text-text-muted">
                    Apagar
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {children}
      </div>
    </div>
  );
}

export interface CommentProps extends CommentActionHandlers {
  comment: CommentData;
  onReply?: () => void;
  editing?: boolean;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  /** <CommentReply> filhos, ou um formulário de resposta — renderizados abaixo das ações. */
  children?: ReactNode;
}

export function Comment({ comment, onReply, children, ...rest }: CommentProps) {
  return (
    <CommentBody comment={comment} avatarSize="md" onReply={onReply} {...rest}>
      {children}
    </CommentBody>
  );
}

export interface CommentReplyProps extends CommentActionHandlers {
  comment: CommentData;
  editing?: boolean;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

// Respostas não têm botão "Responder" (sem threading de segundo nível), avatar menor e indentação.
export function CommentReply({ comment, ...rest }: CommentReplyProps) {
  return <CommentBody comment={comment} avatarSize="sm" indent {...rest} />;
}
