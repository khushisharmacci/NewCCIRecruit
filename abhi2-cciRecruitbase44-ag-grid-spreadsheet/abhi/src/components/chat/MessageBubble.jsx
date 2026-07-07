import { FileText, Image, Download } from "lucide-react";
import { formatMessageTime } from "./chatUtils";

export default function MessageBubble({ message, isOwn, showAvatar, senderName }) {
  const isDeleted = message.is_deleted;

  const renderContent = () => {
    if (isDeleted) return <span className="italic text-muted-foreground text-sm">Message deleted</span>;

    if (message.message_type === "file" || message.message_type === "image") {
      const isImg = message.message_type === "image" || /\.(png|jpg|jpeg|gif|webp)$/i.test(message.file_name || "");
      return (
        <div>
          {isImg ?
          <img
  src={message.file_url}
  alt={message.file_name}
  className="max-w-xs rounded-2xl object-cover shadow-sm cursor-pointer"
/> :

          <a
  href={message.file_url}
  target="_blank"
  rel="noopener noreferrer"
  className={`flex items-center gap-3 p-4 rounded-2xl shadow-sm max-w-sm transition ${
    isOwn
      ? "bg-primary text-primary-foreground rounded-br-sm"
      : "bg-muted text-foreground rounded-bl-sm"
  }`}
>
  <FileText className="h-8 w-8 shrink-0" />

  <div className="flex-1 min-w-0">
    <p className="font-medium truncate">
      {message.file_name}
    </p>

    <p className="text-xs opacity-70">
      Click to open
    </p>
  </div>

  <Download className="h-5 w-5 shrink-0" />
</a>
          }
          {message.message && (
  <p
    className="text-sm mt-1"
    dangerouslySetInnerHTML={{
      __html: renderText(message.message),
    }}
  />
)}
        </div>);

    }

    return (
  <p
    className="text-sm whitespace-pre-wrap break-words"
    dangerouslySetInnerHTML={{
      __html: renderText(message.message || ""),
    }}
  />
);
  };

  const renderText = (text = "") =>
  String(text).replace(
    /@(\w+)/g,
    '<span class="font-semibold opacity-90">@$1</span>'
  );

  return (
    <div
  className={`flex w-full items-end gap-2 ${
    isOwn ? "justify-end" : "justify-start"
  }`}
>
      {!isOwn && (
  <div
    className={`h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 mb-1 ${
      showAvatar ? "visible" : "invisible"
    }`}
  >
    {senderName?.charAt(0).toUpperCase() || "?"}
  </div>
)}
      <div
  className={`flex flex-col max-w-[70%] ${
    isOwn ? "items-end" : "items-start"
  }`}
>
        {!isOwn && showAvatar &&
        <span className="text-xs text-muted-foreground mb-1 ml-1">{senderName}</span>
        }
        {message.message_type === "file" ||
message.message_type === "image" ? (
  renderContent()
) : (
  <div
    className={`px-4 py-3 rounded-2xl shadow-sm break-words ${
      isOwn
        ? "bg-primary text-primary-foreground rounded-br-sm"
        : "bg-muted text-foreground rounded-bl-sm"
    }`}
  >
    {renderContent()}
  </div>
)}
        <span className="text-[10px] text-muted-foreground mt-1 mx-1">
          {formatMessageTime(message.created_at)}
        </span>
      </div>
    </div>);

}