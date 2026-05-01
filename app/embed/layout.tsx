export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="box-border h-dvh min-h-0 w-full overflow-hidden overscroll-none">
      {children}
    </div>
  );
}
