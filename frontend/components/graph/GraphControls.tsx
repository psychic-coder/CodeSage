import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  languages: string[];
  language: string;
  onLanguageChange: (value: string) => void;
  onReset?: () => void;
};

export default function GraphControls({ search, onSearchChange, languages, language, onLanguageChange, onReset }: Props) {
  return (
    <div className="panel pad" style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
      <Input placeholder="Search files…" value={search} onChange={(e) => onSearchChange(e.target.value)} style={{ minWidth: 240 }} />
      <select value={language} onChange={(e) => onLanguageChange(e.target.value)} className="input" style={{ minWidth: 160 }}>
        <option value="">All languages</option>
        {languages.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <Button type="button" onClick={onReset}>Reset</Button>
    </div>
  );
}
