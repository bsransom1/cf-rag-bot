export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/*
       * Strip the root layout's bg-cf-page from html/body so only the
       * ChatWindow paints its own background — the iframe is transparent
       * in the FAB (launcher) state and opaque only when the panel is open.
       */}
      <style>{`html,body{background:transparent!important}`}</style>
      <div className="box-border h-dvh min-h-0 w-full overflow-hidden overscroll-none">
        {children}
      </div>
    </>
  );
}
