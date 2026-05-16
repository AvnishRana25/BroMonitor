export function SubjectPill({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  return (
    <span
      className="chip"
      style={{
        background: `${color}1a`,
        borderColor: `${color}55`,
        color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {name}
    </span>
  );
}
