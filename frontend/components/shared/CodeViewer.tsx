type Props = { code: string };

export function CodeViewer({ code }: Props) {
  return <pre className="panel pad" style={{ overflowX: "auto", whiteSpace: "pre-wrap" }}>{code}</pre>;
}
