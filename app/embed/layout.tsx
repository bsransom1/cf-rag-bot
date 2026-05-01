import { EmbedTransparentBeforeInteractive } from "./embed-before-interactive";
import { EmbedTransparentPaint } from "./embed-transparent-paint";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EmbedTransparentBeforeInteractive />
      {/*
       * Strip the root layout's bg-cf-page from html/body so only ChatWindow
       * paints opaque chrome. Redundant with script + globals + client hook —
       * each defeats a different timing / cascade ordering issue across browsers.
       */}
      <style>{`html,body{background:transparent!important;background-color:transparent!important}`}</style>
      <EmbedTransparentPaint />
      <div className="cf-embed-frame box-border h-dvh min-h-0 w-full overflow-hidden overscroll-none bg-transparent">
        {children}
      </div>
    </>
  );
}
